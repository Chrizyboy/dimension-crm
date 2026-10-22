import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useFinanzen } from '../hooks/useFinanzen'
import { heuteZuerich, montag, plusTage } from '../lib/datum'
import { vorschau } from '../lib/vorschau'

/**
 * Finanzen für die Startseite (V233 «Mein Tag»: Finanzen-Karte, nur mit Recht «finanzen»): Kontostand, tiefster
 * Stand und was diese Woche zu zahlen ist (ohne Fixkosten), höchstens sechs.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const daten = useFinanzen()
  const heute = heuteZuerich()
  const v = daten.data ? vorschau(daten.data, heute, 'real') : null
  const ende = plusTage(montag(heute), 6)
  const faellig = (v?.bewegungen ?? [])
    .filter((b) => b.richtung < 0 && b.quelle !== 'fix' && (!b.datum || b.datum <= ende))
    .sort((a, b) => (a.datum ?? '0').localeCompare(b.datum ?? '0'))

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('finanzen.titel')}</KarteTitel>
        <Link to="/finance" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('finanzen.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {v && (
        <dl className="flex flex-col gap-1 px-4 pb-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t('finanzen.kachel.kontostand')}</dt>
            <dd className="zahlen font-semibold">
              {v.saldo.bekannt ? formatChf(v.saldo.rappen, { mitWaehrung: true }) : '–'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">
              {t('finanzen.kachel.tiefster')}
              {v.tiefste && <span className="ml-1 text-xs">{t('finanzen.kw', { kw: v.tiefste.kw })}</span>}
            </dt>
            <dd className={cn('zahlen font-semibold', v.tiefste && v.tiefste.ende < 0 && 'text-bad')}>
              {v.tiefste ? formatChf(v.tiefste.ende, { mitWaehrung: true }) : '–'}
            </dd>
          </div>
        </dl>
      )}
      {faellig.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('finanzen.heute.nichts')}</p>
      ) : (
        <ul className="divide-y border-t">
          {faellig.slice(0, 6).map((b) => (
            <li key={`${b.quelle}-${b.id}-${String(b.idx ?? '')}`}>
              <Link
                to="/finance"
                search={{ reiter: 'zahlungen' }}
                className="hover:bg-surface-2 flex flex-col gap-0.5 px-4 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{b.titel}</span>
                <span className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn(!b.datum || b.spaet ? 'text-bad' : 'text-muted-foreground')}>
                    {b.datum ? formatDatum(b.datum).slice(0, 6) : t('finanzen.ohneDatum')}
                  </span>
                  <b className="zahlen">{b.lohn ? '••••' : formatChf(b.rappen)}</b>
                </span>
              </Link>
            </li>
          ))}
          {faellig.length > 6 && (
            <li className="text-muted-foreground px-4 py-2 text-xs">
              {t('finanzen.heute.weitere', { count: faellig.length - 6 })}
            </li>
          )}
        </ul>
      )}
    </Karte>
  )
}
