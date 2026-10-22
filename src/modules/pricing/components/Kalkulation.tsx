import { useState } from 'react'
import { useKalkulationen } from '../hooks/usePreise'
import type { Artikel, Kalkulation as KalkulationTyp } from '../types'
import { positionAusArtikel } from '../lib/kalkulation'
import { GespeicherteKalkulationen } from './GespeicherteKalkulationen'
import { Katalog } from './Katalog'
import { KalkBlatt } from './KalkBlatt'

/** Leere Kalkulation, wahlweise schon mit Offerte. */
function neue(offerteId: string | null = null): KalkulationTyp {
  return { id: null, titel: '', offerteId, rabattProzent: 0, notiz: '', positionen: [] }
}

/**
 * Kalkulation (Preisberechnung, Inventar Phase 0): links der Katalog der Preisliste, rechts das Blatt mit
 * Positionen, Summen und Deckungsbeitrag, darunter die gespeicherten Kalkulationen. Kommt man aus einer
 * Offerte (?offerte=…), öffnet sich deren letzte Kalkulation oder eine neue mit dieser Offerte.
 */
export default function Kalkulation({
  artikel,
  offerteId,
  onOfferte,
}: {
  artikel: Artikel[]
  offerteId: string | null
  onOfferte: (id: string | null) => void
}) {
  const gespeichert = useKalkulationen(true)
  const [k, setK] = useState<KalkulationTyp>(() => neue(offerteId))
  const [geaendert, setGeaendert] = useState(false)

  // Für welche Offerte die Adresse schon ausgewertet ist. Wählt man selbst (Liste, Auswahl im Blatt),
  // wird das vorher gesetzt, damit die Adresse die offene Kalkulation nicht ersetzt.
  const [geladenFuer, setGeladenFuer] = useState<string | null>(null)
  if (offerteId && gespeichert.data && geladenFuer !== offerteId) {
    setGeladenFuer(offerteId)
    setK(gespeichert.data.find((x) => x.offerteId === offerteId) ?? neue(offerteId))
    setGeaendert(false)
  }
  const zeigeOfferte = (id: string | null) => {
    setGeladenFuer(id)
    onOfferte(id)
  }

  const aendere = (n: KalkulationTyp) => {
    setK(n)
    setGeaendert(true)
  }

  function dazu(a: Artikel, menge = 1) {
    const da = k.positionen.find((p) => p.artikelId === a.id)
    aendere({
      ...k,
      positionen: da
        ? k.positionen.map((p) => (p === da ? { ...p, menge: p.menge + menge } : p))
        : [...k.positionen, positionAusArtikel(a, menge)],
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Katalog artikel={artikel} onDazu={dazu} />
        <KalkBlatt
          k={k}
          artikel={artikel}
          geaendert={geaendert}
          onAendern={aendere}
          onGespeichert={(id) => {
            setK((x) => ({ ...x, id }))
            setGeaendert(false)
          }}
          onNeu={() => {
            setK(neue())
            setGeaendert(false)
            zeigeOfferte(null)
          }}
          onOfferte={zeigeOfferte}
        />
      </div>
      <GespeicherteKalkulationen
        kalkulationen={gespeichert.data ?? []}
        laedt={gespeichert.isPending}
        aktiveId={k.id}
        onOeffnen={(x) => {
          setK(x)
          setGeaendert(false)
          zeigeOfferte(x.offerteId)
        }}
        onEntfernt={(id) => {
          if (k.id === id) setK(neue())
        }}
      />
    </div>
  )
}
