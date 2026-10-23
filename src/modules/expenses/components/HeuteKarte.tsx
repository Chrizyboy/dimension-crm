import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useSpesen } from '../hooks/useSpesen'
import { filtern, summe } from '../lib/spesen'

/**
 * Spesen für die Startseite (V233 «Mein Tag»: Spesen-Karte): eigene offene Spesen, für die Buchhaltung dazu
 * alle offenen, die auf die Auszahlung warten.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const buchhaltung = hatRecht(ich, 'finanzen')
  const meine = filtern(useSpesen(ich?.id ?? null, Boolean(ich)).data ?? [], 'offen')
  const alle = filtern(useSpesen(null, buchhaltung).data ?? [], 'offen')
  const zeilen = [
    { schluessel: 'meine' as const, text: t('spesen.heute.meine', { count: meine.length }), liste: meine },
    ...(buchhaltung
      ? [{ schluessel: 'alle' as const, text: t('spesen.heute.alle', { count: alle.length }), liste: alle }]
      : []),
  ].filter((z) => z.liste.length > 0)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('spesen.titel')}</KarteTitel>
        <Link to="/expenses" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('spesen.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('spesen.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {zeilen.map((z) => (
            <li key={z.schluessel}>
              <Link
                to="/expenses"
                search={z.schluessel === 'alle' ? { ansicht: 'alle' } : {}}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span>{z.text}</span>
                <Badge ton={z.schluessel === 'alle' ? 'warnung' : 'info'}>
                  {formatChf(summe(z.liste), { mitWaehrung: true })}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
