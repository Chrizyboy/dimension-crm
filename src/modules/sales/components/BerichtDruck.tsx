import { createPortal } from 'react-dom'
import { formatDatum } from '@/lib/format'

/**
 * PDF des Berichts (V233 lbPdf): Logo, Titel, Quelle und Datum, darunter der Text. Über den Druckdialog
 * als PDF sichern. Papier ist weiss, darum feste Farben.
 */
export function BerichtDruck({
  titel,
  unter,
  text,
  sprache,
}: {
  titel: string
  unter: string
  text: string
  sprache: 'de' | 'fr'
}) {
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#10263f' }}>
      <img src={`./logo/logo-hell-${sprache}.png`} alt="Dimension Solaire" style={{ height: 40 }} />
      <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '10px 0 18px' }} />
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>{titel}</h1>
      <p style={{ color: '#5a6473', margin: '4px 0 16px' }}>
        {unter} · {formatDatum(new Date())}
      </p>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{text}</div>
    </div>,
    document.body,
  )
}
