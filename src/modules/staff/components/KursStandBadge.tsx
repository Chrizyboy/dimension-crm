import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { KursStand } from '../types'

const TON = {
  beantragt: 'warnung',
  bewilligt: 'ok',
  angemeldet: 'info',
  besucht: 'neutral',
  abgesagt: 'neutral',
} as const

/** Stand eines Kurses als Marke, immer mit Wort. */
export function KursStandBadge({ stand }: { stand: KursStand }) {
  const { t } = useTranslation()
  return (
    <Badge ton={TON[stand]} punkt={stand === 'beantragt'}>
      {t(`team.kurs.stand.${stand}`)}
    </Badge>
  )
}
