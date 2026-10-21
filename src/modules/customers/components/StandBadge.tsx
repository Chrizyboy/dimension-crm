import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'

/** Der «Stand» eines Kunden (V137) als farbige Marke. Ohne Geschäft: «Kein Geschäft». */
export function StandBadge({ stand }: { stand: string | null }) {
  const { t } = useTranslation()
  const { finde, text } = useAuswahl('kundenstand')
  if (!stand) return <span className="text-muted-foreground text-xs">{t('kunden.keinGeschaeft')}</span>
  return (
    <Badge ton={tonVonFarbe(finde(stand)?.farbe)} punkt>
      {text(stand)}
    </Badge>
  )
}
