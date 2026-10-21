import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'
import { nachfassStand } from '../lib/nachfassen'
import type { Offerte } from '../types'

/** Stand einer Offerte als Marke, in den Farben der Pipeline (Liste «kundenstand»). */
export function OffertStand({ stand }: { stand: string }) {
  const staende = useAuswahl('kundenstand')
  return (
    <Badge ton={tonVonFarbe(staende.finde(stand)?.farbe)} punkt>
      {staende.text(stand)}
    </Badge>
  )
}

/** «Nachfassen in 5 T.», «heute nachfassen», «fällig seit 12 T.», «vertagt bis 12.11.2026» (V45). */
export function NachfassChip({ offerte }: { offerte: Offerte }) {
  const { t } = useTranslation()
  const s = nachfassStand(offerte)
  if (!s) return <span className="text-muted-foreground">–</span>
  const ton = s.art === 'faellig' ? 'kritisch' : s.art === 'heute' ? 'warnung' : 'neutral'
  return (
    <Badge ton={ton}>
      {s.art === 'vertagt' && s.datum
        ? t('offerten.nachfassen.vertagtBis', { datum: s.datum.split('-').reverse().join('.') })
        : t(`offerten.nachfassen.chip_${s.art}`, { count: s.tage })}
    </Badge>
  )
}
