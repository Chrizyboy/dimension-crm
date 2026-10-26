import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { fristStand, heuteZuerich, tageBis } from '../lib/fristen'
import type { FristStand } from '../types'

const TON: Record<FristStand, 'kritisch' | 'warnung' | 'neutral'> = {
  ueberfaellig: 'kritisch',
  bald: 'warnung',
  ok: 'neutral',
}

/** Frist als Marke: Datum, bei «bald» mit Tagen, bei «vorbei» rot. Ohne Datum ein Strich. */
export function FristBadge({ datum, vorlauf = 30, vor }: { datum: string | null; vorlauf?: number; vor?: string }) {
  const { t } = useTranslation()
  if (!datum) return <span className="text-muted-foreground">–</span>
  const heute = heuteZuerich()
  const stand = fristStand(datum, heute, vorlauf)
  const tage = tageBis(datum, heute)
  const text =
    stand === 'ueberfaellig'
      ? t('fuhrpark.frist.vorbei', { datum: formatDatum(datum) })
      : stand === 'bald'
        ? t('fuhrpark.frist.inTagen', { datum: formatDatum(datum), count: tage })
        : formatDatum(datum)
  return (
    <Badge ton={TON[stand]} punkt={stand !== 'ok'} className="zahlen">
      {vor ? `${vor} ${text}` : text}
    </Badge>
  )
}
