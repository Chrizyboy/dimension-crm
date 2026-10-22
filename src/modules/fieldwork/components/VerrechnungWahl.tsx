import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { VERRECHNUNG, type Verrechnung } from '../types'

/** Wie ein Service-Einsatz verrechnet wird: Garantie (gratis), kostenpflichtig, Kulanz oder Wartungsvertrag. */
export function VerrechnungWahl({
  wert,
  gesperrt = false,
  onWahl,
}: {
  wert: Verrechnung | null
  gesperrt?: boolean
  onWahl: (v: Verrechnung) => void
}) {
  const { t } = useTranslation()
  const optionen = VERRECHNUNG.map((v) => ({ wert: v, text: t(`baustelle.verrechnung.${v}`) }))
  if (gesperrt) return <p className="text-sm">{wert ? t(`baustelle.verrechnung.${wert}`) : '–'}</p>
  return (
    <div className="flex flex-col gap-1.5">
      <Filterchips
        einzeln
        beschriftung={t('baustelle.verrechnung.titel')}
        optionen={optionen}
        gewaehlt={wert ? [wert] : []}
        onChange={([v]) => {
          if (v) onWahl(v as Verrechnung)
        }}
      />
      <p className="text-muted-foreground text-xs">{t('baustelle.verrechnung.hinweis')}</p>
    </div>
  )
}
