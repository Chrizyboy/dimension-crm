import { createPortal } from 'react-dom'
import { formatDatum } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { bauherrZeilen, werkvertragAbschnitte } from '../lib/werkvertragText'
import type { Werkvertrag } from '../types'

function Unterschrift({ ueber, wer }: { ueber: string; wer: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ borderBottom: '1px solid #000', height: 46 }} />
      <div style={{ fontSize: 10, paddingTop: 3 }}>{ueber}</div>
      <div style={{ fontSize: 11, fontWeight: 700 }}>{wer}</div>
    </div>
  )
}

/**
 * Druckblatt des Werkvertrags (V233 wvPdf) in der Vertragssprache, nicht in der Sprache der Oberfläche:
 * Logo, Firma, Adresse des Bauherrn, Nummern, die 15 Abschnitte und zwei Unterschriftsfelder.
 * «Als PDF sichern» im Druckfenster ergibt das PDF für den Kunden.
 */
export function WerkvertragDruck({ w }: { w: Werkvertrag }) {
  const fr = w.sprache === 'fr'
  const firma = [w.firma.name, w.firma.strasse, [w.firma.plz, w.firma.ort].filter(Boolean).join(' ')].filter(Boolean)
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, lineHeight: 1.45 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <img src={`./logo/logo-hell-${w.sprache}.png`} alt="Dimension Solaire" style={{ height: 46 }} />
        <div style={{ fontSize: 9, textAlign: 'right' }}>
          {firma.map((z) => (
            <div key={z}>{z}</div>
          ))}
          {w.firma.mwstNr && (
            <div>
              {fr ? 'N° TVA' : 'MWST-Nr.'} {w.firma.mwstNr}
            </div>
          )}
        </div>
      </header>

      <div style={{ marginTop: 28, minHeight: 70 }}>
        {bauherrZeilen(w).map((z) => (
          <div key={z} style={{ fontSize: 12 }}>
            {z}
          </div>
        ))}
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 18 }}>{fr ? 'Contrat d’entreprise' : 'Werkvertrag'}</h1>
      <p style={{ fontSize: 10, marginBottom: 10 }}>
        {[
          `${fr ? 'N°' : 'Nr.'} ${w.nummer}${w.version > 1 ? ` (V${w.version})` : ''}`,
          `${fr ? 'N° client' : 'Kunden-Nr.'} ${formatKundennummer(w.kundennummer)}`,
          w.erstelltDatum ? formatDatum(w.erstelltDatum) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {werkvertragAbschnitte(w).map(([titel, text]) => (
        <section key={titel} style={{ marginTop: 9, breakInside: 'avoid' }}>
          <h2 style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 2 }}>{titel}</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{text}</p>
        </section>
      ))}

      <div style={{ display: 'flex', gap: 36, marginTop: 34, breakInside: 'avoid' }}>
        <Unterschrift ueber={fr ? 'Lieu, date' : 'Ort, Datum'} wer={fr ? 'Maître d’ouvrage' : 'Bauherr'} />
        <Unterschrift ueber={fr ? 'Lieu, date' : 'Ort, Datum'} wer={w.firma.name ?? 'Dimension Solaire'} />
      </div>
    </div>,
    document.body,
  )
}
