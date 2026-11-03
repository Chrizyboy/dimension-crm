import { useTranslation } from 'react-i18next'
import { useAusgangWoche } from '../hooks/useAusgang'

/** Drei Zahlen über «Gesendet»: wie viel ging diese Woche raus, wie lange wartete es, wie viele haben geantwortet. */
export function WocheZahlen() {
  const { t } = useTranslation()
  const w = useAusgangWoche(true).data
  if (!w) return null
  const kacheln = [
    { z: String(w.gesendet), l: t('ausgang.woche.gesendet') },
    { z: w.wartezeitMin === null ? '–' : dauer(w.wartezeitMin), l: t('ausgang.woche.wartezeit') },
    { z: String(w.antworten), l: t('ausgang.woche.antworten') },
  ]
  return (
    <dl className="grid grid-cols-3 gap-2">
      {kacheln.map((k) => (
        <div key={k.l} className="flex flex-col rounded-lg border px-2.5 py-1.5">
          <dd className="zahlen font-display text-lg font-semibold">{k.z}</dd>
          <dt className="text-muted-foreground text-xs">{k.l}</dt>
        </div>
      ))}
    </dl>
  )
}

function dauer(min: number): string {
  if (min < 60) return `${min} Min.`
  if (min < 60 * 24) return `${Math.round(min / 60)} Std.`
  return `${Math.round(min / 1440)} T.`
}
