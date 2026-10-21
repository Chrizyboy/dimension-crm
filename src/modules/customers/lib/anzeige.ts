import { formatChf, formatDatum } from '@/lib/format'

/** Datum oder leer, für Angaben, die fehlen dürfen. */
export function datumOderLeer(wert: string | null | undefined): string {
  return wert ? formatDatum(wert) : ''
}

/** Datum mit Uhrzeit (Termin), z. B. «21.10.2026, 14:00». */
export function terminText(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${formatDatum(d)}, ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
}

/** Betrag in Rappen als «CHF 12'500.00», leer wenn unbekannt. */
export function chfOderLeer(rappen: number | null | undefined): string {
  return rappen === null || rappen === undefined ? '' : formatChf(rappen, { mitWaehrung: true })
}

/** Leistung wie «19.2 kWp». */
export function kwpText(kwp: number | null | undefined): string {
  return kwp ? `${String(kwp)} kWp` : ''
}

/** Wert aus einem JSON-Feld als Text (alte V233-Felder sind mal Zahl, mal Text). */
export function jsonText(objekt: unknown, schluessel: string): string {
  if (!objekt || typeof objekt !== 'object') return ''
  const w = (objekt as Record<string, unknown>)[schluessel]
  return typeof w === 'string' || typeof w === 'number' ? String(w) : ''
}
