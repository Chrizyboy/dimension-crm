import { createPortal } from 'react-dom'
import { formatDatum } from '@/lib/format'

/** Ein Brief zum Drucken: Empfänger-Adresse, Betreff und der volle Text (mit Signatur und PS). */
export interface Brief {
  id: string
  sprache: 'de' | 'fr'
  adresse: string
  betreff: string
  text: string
}

/** Absender und Ort je Sprache: Deutsch aus Muri, Französisch aus Bulle (wie die Signaturen). */
const ABSENDER = {
  de: { zeile: 'Dimension Solaire GmbH · Luzernerstrasse 35 · 5630 Muri AG', ort: 'Muri AG' },
  fr: { zeile: 'Dimension Solaire Sàrl · Chemin des Crêts 4 · 1630 Bulle', ort: 'Bulle' },
}

/**
 * Briefe mit Briefkopf (Logo, Absenderzeile), Adresse im Fenster, Ort und Datum, Betreff fett und Text.
 * Jeder Brief auf eine eigene Seite. Papier ist weiss, darum feste Farben.
 */
export function BriefDruck({ briefe }: { briefe: Brief[] }) {
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#10263f' }}>
      {briefe.map((b, i) => (
        <section key={b.id} style={{ breakAfter: i < briefe.length - 1 ? 'page' : 'auto', padding: '0 4mm' }}>
          <img src={`./logo/logo-hell-${b.sprache}.png`} alt="Dimension Solaire" style={{ height: 40 }} />
          <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '10px 0 6px' }} />
          <p style={{ fontSize: 8, color: '#5a6473', margin: '22mm 0 2mm' }}>{ABSENDER[b.sprache].zeile}</p>
          <p style={{ whiteSpace: 'pre-line', minHeight: '28mm', lineHeight: 1.4 }}>
            {b.adresse.split(', ').join('\n')}
          </p>
          <p style={{ margin: '10mm 0 6mm' }}>
            {ABSENDER[b.sprache].ort}, {formatDatum(new Date())}
          </p>
          <p style={{ fontWeight: 700, marginBottom: '6mm' }}>{b.betreff}</p>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{b.text}</div>
        </section>
      ))}
    </div>,
    document.body,
  )
}
