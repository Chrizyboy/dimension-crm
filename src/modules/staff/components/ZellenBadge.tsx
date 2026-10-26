import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ZellenStand } from '../types'

const TON = { gueltig: 'ok', bald: 'warnung', abgelaufen: 'kritisch', fehlt: 'kritisch', leer: 'neutral' } as const

/** Monat und Jahr (11.26) statt des ganzen Datums: die Übersicht bleibt schmal. */
const kurz = (iso: string) => `${iso.slice(5, 7)}.${iso.slice(2, 4)}`

/** Zelle der Übersicht «wer darf was»: immer mit Wort, nie nur Farbe. */
export function ZellenBadge({ stand, bis }: { stand: ZellenStand; bis: string | null }) {
  const { t } = useTranslation()
  if (stand === 'leer') return <span className="text-muted-foreground">–</span>
  const text =
    stand === 'fehlt'
      ? t('team.zelle.fehlt')
      : stand === 'abgelaufen'
        ? t('team.zelle.abgelaufen')
        : bis
          ? t('team.zelle.bis', { datum: kurz(bis) })
          : t('team.zelle.ja')
  return (
    <Badge ton={TON[stand]} punkt={stand !== 'gueltig'} className="zahlen">
      {text}
    </Badge>
  )
}
