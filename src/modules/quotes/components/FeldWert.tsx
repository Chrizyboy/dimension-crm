import { formatChf, formatDatum } from '@/lib/format'
import type { PdfFeld } from '../lib/pdfUebernahme'

/** Zeigt einen Offertwert passend formatiert (Betrag, Datum, kWp …); leer als «–». */
export function FeldWert({ feld, wert }: { feld: PdfFeld; wert: string | number | null }) {
  if (wert === null || wert === '') return <>–</>
  if (feld === 'betrag_rappen') return <span className="zahlen font-mono">{formatChf(Number(wert))}</span>
  if (feld === 'angebot_am') return <>{formatDatum(String(wert))}</>
  if (feld === 'leistung_kwp') return <>{wert} kWp</>
  return <>{wert}</>
}
