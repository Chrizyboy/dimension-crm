import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { fristTon, nurDatum, tageBis } from '../../lib/anzeige'
import type { Dossier } from '../../types'
import { Box } from '../Box'

/** Alle Fristen des Dossiers mit Tagen bis dahin; bei Post-Eingabe der Hinweis, dass der Eingang zählt. */
export function FristenBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  const zeilen = [
    ['fragen', d.frist_fragen],
    ['begehung', d.frist_begehung],
    [d.art === 'baugesuch' ? 'einsprache' : 'eingabe', d.frist_eingabe ?? d.frist],
    ['oeffnung', d.frist_oeffnung],
    ['zuschlag', d.zuschlag_erwartet],
    ['beschwerde', d.beschwerde_bis],
    ['ausloeser', d.ausloeser_am],
  ].filter((z): z is [string, string] => Boolean(z[1]))
  if (zeilen.length === 0) return null
  return (
    <Box titel={t('ausschreibungen.akte.fristen')}>
      <ul className="flex flex-col gap-1.5">
        {zeilen.map(([art, am]) => {
          const tage = tageBis(am) ?? 0
          return (
            <li key={art} className="flex items-center justify-between gap-2">
              <span>{t(`ausschreibungen.fristArt.${art}`)}</span>
              <span className="flex items-center gap-1.5">
                <span className="zahlen text-xs">{nurDatum(am) ? formatDatum(am) : formatDatumZeit(am)}</span>
                <Badge ton={tage < 0 ? 'neutral' : fristTon(am)}>
                  {tage < 0 ? t('ausschreibungen.abgelaufen') : t('ausschreibungen.inTagen', { count: tage })}
                </Badge>
              </span>
            </li>
          )
        })}
      </ul>
      {d.spur === 'angebot' && <p className="text-muted-foreground text-xs">{t('ausschreibungen.akte.forum')}</p>}
    </Box>
  )
}
