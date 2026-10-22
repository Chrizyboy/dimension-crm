/** Anzeige-Helfer für den Einkauf. */

/** Menge ohne unnötige Nachkommastellen: 12, 2.5, 0.125. */
export function formatMenge(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('de-CH', { maximumFractionDigits: 3 })
}

/** Heute plus n Tage als ISO-Datum (für Datumsfelder). */
export function inTagen(heute: Date, n: number): string {
  const d = new Date(heute)
  d.setDate(d.getDate() + n)
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Text in eine Zahl (Komma oder Punkt); leer oder ungültig = null. */
export function alsZahl(text: string): number | null {
  const n = Number(text.replace(/'/g, '').replace(',', '.').trim())
  return text.trim() === '' || !Number.isFinite(n) ? null : n
}
