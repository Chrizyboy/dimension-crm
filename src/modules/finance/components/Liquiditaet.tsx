import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { LIQ_TEILE, type Bewegung, type Finanzdaten, type LiqTeil } from '../types'
import type { BewegungAktion } from './BewegungZeile'
import { Eingaenge } from './Eingaenge'
import type { FinanzFenster } from './Fenster'
import { Fixkosten } from './Fixkosten'
import { Material } from './Material'
import { Uebersicht } from './Uebersicht'

/**
 * Liquidität (13 Wochen und mehr): die Wochen und die drei Listen, aus denen sie entstehen (Material je Baustelle,
 * Fixkosten, erwartete Eingänge). Früher eigene Reiter, jetzt ein Reiter mit Unterteilen.
 */
export function Liquiditaet({
  daten,
  reserve,
  lohnZeigen,
  onAktion,
  onFenster,
}: {
  daten: Finanzdaten
  reserve: number
  lohnZeigen: boolean
  onAktion: (b: Bewegung, a: BewegungAktion) => void
  onFenster: (f: FinanzFenster) => void
}) {
  const { t } = useTranslation()
  const [teil, setTeil] = useState<LiqTeil>('wochen')
  const anzahl: Record<LiqTeil, number | undefined> = {
    wochen: undefined,
    material: daten.material.filter((m) => !m.archiviert).length,
    fixkosten: daten.fixkosten.filter((f) => f.aktiv).length,
    eingaenge: daten.eingaenge.filter((e) => e.status !== 'eingegangen').length,
  }
  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        einzeln
        beschriftung={t('finanzen.liq.teil')}
        optionen={LIQ_TEILE.map((x) => {
          const n = anzahl[x]
          return n === undefined
            ? { wert: x, text: t(`finanzen.liq.${x}`) }
            : { wert: x, text: t(`finanzen.liq.${x}`), anzahl: n }
        })}
        gewaehlt={[teil]}
        onChange={([x]) => {
          if (x) setTeil(x as LiqTeil)
        }}
      />
      {teil === 'wochen' && <Uebersicht daten={daten} reserve={reserve} lohnZeigen={lohnZeigen} onAktion={onAktion} />}
      {teil === 'material' && (
        <Material
          daten={daten}
          onBearbeiten={(m) => {
            onFenster({ art: 'material', id: m?.id ?? null })
          }}
        />
      )}
      {teil === 'fixkosten' && (
        <Fixkosten
          daten={daten}
          lohnZeigen={lohnZeigen}
          onBearbeiten={(f) => {
            onFenster({ art: 'fix', id: f?.id ?? null })
          }}
        />
      )}
      {teil === 'eingaenge' && (
        <Eingaenge
          daten={daten}
          onAktion={onAktion}
          onNeu={() => {
            onFenster({ art: 'eingang', id: null })
          }}
        />
      )}
    </div>
  )
}
