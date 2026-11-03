import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAusgang } from '../hooks/useAusgang'
import { imOrdner, vorschau, wartetStunden } from '../lib/anzeige'

/**
 * «Wartet auf deine Freigabe» für «Mein Tag»: was ich freigeben soll und was mit Fehler hängt (höchstens fünf, das
 * Älteste zuerst). Ist nichts offen, erscheint die Karte gar nicht.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const alle = useAusgang('fuer_mich').data ?? []
  const meine = alle
    .filter((e) => imOrdner(e, 'fuer_mich') || (e.status === 'fehler' && e.fuer_mich))
    .sort((a, b) => a.erstellt_am.localeCompare(b.erstellt_am))
  if (meine.length === 0) return null
  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('ausgang.heute.titel')}</KarteTitel>
        <a href="#/outbox" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('ausgang.heute.alle', { count: meine.length })}
          <ArrowRight className="size-3.5" />
        </a>
      </KarteKopf>
      <ul className="divide-y">
        {meine.slice(0, 5).map((e) => {
          const std = wartetStunden(e)
          return (
            <li key={e.id}>
              <a href={`#/outbox?eintrag=${e.id}`} className="hover:bg-surface-2 flex flex-col gap-1 px-4 py-2 text-sm">
                <span className="line-clamp-2">
                  <span className="font-medium">{e.kunde ?? e.an}</span>
                  {vorschau(e) ? ` · ${vorschau(e)}` : ''}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge>{t(`ausgang.art.${e.art}`, { defaultValue: e.art })}</Badge>
                  {e.status === 'fehler' && <Badge ton="kritisch">{t('ausgang.status.fehler')}</Badge>}
                  {std >= 4 && <Badge ton="warnung">{t('ausgang.seitStunden', { count: std })}</Badge>}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </Karte>
  )
}
