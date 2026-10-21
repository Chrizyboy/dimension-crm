import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import type { Wirtschaftlichkeit } from '../types'

const ZAHL = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 })

/**
 * Wirtschaftlichkeit aus Eturnity (Entscheid ERP-Analyse: aus Eturnity statt eigener Rechner):
 * Jahresertrag, Eigenverbrauch, Unabhängigkeit, Rendite, Solarstrompreis, Förderung und Ertrag über 25 Jahre.
 */
export function WirtschaftlichkeitKarte({ w }: { w: Wirtschaftlichkeit }) {
  const { t } = useTranslation()
  const kacheln: { k: string; wert: string }[] = []
  const neu = (k: string, wert: number | undefined, form: (n: number) => string) => {
    if (wert !== undefined) kacheln.push({ k, wert: form(wert) })
  }
  neu('jahresertrag', w.jahresertragKwh, (n) => `${ZAHL.format(n)} kWh`)
  neu('verbrauch', w.verbrauchKwh, (n) => `${ZAHL.format(n)} kWh`)
  neu('eigenverbrauch', w.eigenverbrauchProzent, (n) => `${ZAHL.format(n)} %`)
  neu('autarkie', w.autarkieProzent, (n) => `${ZAHL.format(n)} %`)
  neu('rendite', w.renditeProzent, (n) => `${ZAHL.format(n)} %`)
  neu('strompreis', w.solarstrompreisRappen, (n) => `${ZAHL.format(n)} Rp./kWh`)
  neu('eiv', w.eivRappen, (n) => formatChf(Math.abs(n), { mitWaehrung: true }))
  neu('steuer', w.steuerersparnisRappen, (n) => formatChf(Math.abs(n), { mitWaehrung: true }))
  neu('effektiv', w.effektiveKostenRappen, (n) => formatChf(n, { mitWaehrung: true }))
  neu('ertrag25', w.ertrag25JahreRappen, (n) => formatChf(n, { mitWaehrung: true }))
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {kacheln.map((k) => (
        <div key={k.k} className="bg-muted/60 rounded-lg p-2">
          <dt className="text-muted-foreground text-[11px]">{t(`offerten.wirtschaftlichkeit.${k.k}`)}</dt>
          <dd className="zahlen font-mono text-sm font-semibold">{k.wert}</dd>
        </div>
      ))}
    </dl>
  )
}
