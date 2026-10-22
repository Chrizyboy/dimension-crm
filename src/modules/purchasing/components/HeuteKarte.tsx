import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useBestellungen, useLager } from '../hooks/useEinkauf'

/** Einkauf für die Startseite: was freizugeben oder zu senden ist, überfällige Lieferungen, Lager unter Minimum. */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const offen = useBestellungen('offen')
  const lager = useLager()
  if (!offen.data) return null
  const wichtig = offen.data
    .filter((b) => b.ueberfaellig || b.status === 'entwurf' || b.status === 'freigegeben')
    .sort((a, b) => Number(b.ueberfaellig) - Number(a.ueberfaellig))
  const unter = (lager.data ?? []).filter((z) => z.unter_mindest).length

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('einkauf.heute.titel')}</KarteTitel>
        <Link to="/purchasing" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('einkauf.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {wichtig.length === 0 && unter === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('einkauf.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {wichtig.slice(0, 5).map((b) => (
            <li key={b.id}>
              <Link
                to="/purchasing"
                search={{ bestellung: b.id }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs">{b.nummer}</span> · {b.lieferant}
                  {b.projekt_nummer && <span className="text-muted-foreground"> · {b.projekt_nummer}</span>}
                </span>
                {b.ueberfaellig && b.liefertermin ? (
                  <Badge ton="kritisch">{formatDatum(b.liefertermin)}</Badge>
                ) : (
                  <Badge ton={b.status === 'entwurf' ? 'neutral' : 'info'}>{t(`einkauf.heute.${b.status}`)}</Badge>
                )}
              </Link>
            </li>
          ))}
          {unter > 0 && (
            <li>
              <Link
                to="/purchasing"
                search={{ reiter: 'lager' }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span>{t('einkauf.heute.unter', { count: unter })}</span>
                <Badge ton="warnung">{unter}</Badge>
              </Link>
            </li>
          )}
        </ul>
      )}
    </Karte>
  )
}
