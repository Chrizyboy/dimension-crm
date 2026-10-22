/** Anzeige-Helfer für den Einkauf. */

/**
 * Menge ohne unnötige Nachkommastellen: 12, 2.5, 1'250. Tausender mit «'» wie bei `formatChf`, von Hand, weil
 * das Trennzeichen von «de-CH» je nach ICU-Version ' oder ’ ist.
 */
export function formatMenge(n: number | null | undefined): string {
  const text = (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false })
  const [ganz = '', rest] = text.split('.')
  const gruppiert = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return rest ? `${gruppiert}.${rest}` : gruppiert
}

/** Heute plus n Tage als ISO-Datum (für Datumsfelder). */
export function inTagen(heute: Date, n: number): string {
  const d = new Date(heute)
  d.setDate(d.getDate() + n)
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Text in eine Zahl (Komma oder Punkt); leer oder ungültig = null. */
export function alsZahl(text: string): number | null {
  const n = Number(text.replace(/['’\s]/g, '').replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(n) ? null : n
}
