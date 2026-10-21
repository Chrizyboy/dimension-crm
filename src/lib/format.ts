/**
 * Schweizer Formate: CHF mit Apostroph als Tausendertrenner (12'500.00), Datum 21.10.2026.
 * Beträge werden intern als Rappen (Ganzzahl) gerechnet, damit keine Rundungsfehler entstehen.
 */

const APOSTROPH = "'"

/** Formatiert Rappen als CHF-Betrag, z.B. 1250000 → "12'500.00". */
export function formatChf(rappen: number, { mitWaehrung = false }: { mitWaehrung?: boolean } = {}): string {
  const negativ = rappen < 0
  const abs = Math.abs(Math.round(rappen))
  const franken = Math.floor(abs / 100)
  const rest = String(abs % 100).padStart(2, '0')
  const gruppiert = String(franken).replace(/\B(?=(\d{3})+(?!\d))/g, APOSTROPH)
  const text = `${negativ ? '−' : ''}${gruppiert}.${rest}`
  return mitWaehrung ? `CHF ${text}` : text
}

/**
 * Rundet auf 5 Rappen (Schweizer Rundung für Rechnungsbeträge).
 * Geschäftsregel aus der Vorlage V170: Zahlungsplan und Preisliste runden auf 5 Rappen.
 */
export function rundeAuf5Rappen(rappen: number): number {
  return Math.round(rappen / 5) * 5
}

/** Liest einen Betrag wie "12'500.50", "12 500,50" oder "12500" in Rappen. Ungültig → null. */
export function parseChf(text: string): number | null {
  const bereinigt = text
    .replace(/CHF/i, '')
    .replace(/['’\s]/g, '')
    .replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(bereinigt)) return null
  return Math.round(Number(bereinigt) * 100)
}

/** Formatiert ein Datum als TT.MM.JJJJ, z.B. "21.10.2026". Akzeptiert Date oder ISO-Text "2026-10-21". */
export function formatDatum(datum: Date | string): string {
  const d = typeof datum === 'string' ? new Date(datum.length === 10 ? `${datum}T12:00:00` : datum) : datum
  const tag = String(d.getDate()).padStart(2, '0')
  const monat = String(d.getMonth() + 1).padStart(2, '0')
  return `${tag}.${monat}.${d.getFullYear()}`
}

/** Formatiert eine Telefonnummer einheitlich wie in der Vorlage (V79): "+41 76 123 45 67". */
export function formatTelefon(nummer: string): string {
  let ziffern = nummer.replace(/[^\d+]/g, '')
  if (ziffern.startsWith('00')) ziffern = '+' + ziffern.slice(2)
  if (ziffern.startsWith('0')) ziffern = '+41' + ziffern.slice(1)
  const m = /^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(ziffern)
  return m ? `+41 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : nummer.trim()
}
