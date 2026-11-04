import { formatChf, formatDatum, formatDatumZeit } from '@/lib/format'

/** Felder mit Datum ohne Uhrzeit. */
const DATUM = /(_am|^datum|^baubeginn|_wartung|_bis|^liefertermin|_termin|_kontrolle|_mfk|_service|_pruefung)$/

/** Dringlichkeit einer Mail (vom Server gerechnet) in der Sprache der Person. */
const STUFE_FR: Record<string, string> = { hoch: 'haute', mittel: 'moyenne', tief: 'basse' }

/**
 * Ein Wert aus einer gelesenen Tabelle, so wie man ihn in Dimension Work sieht: Rappen als CHF, Datum Schweizer
 * Format, Ja/Nein, Listen mit Komma. Die Zahlen kommen aus der Datenbank, nie aus dem Text der KI.
 */
export function zellwert(feld: string, wert: unknown, sprache: 'de' | 'fr'): string {
  if (wert === null || wert === undefined || wert === '') return '–'
  if (feld === 'dringlichkeit' && typeof wert === 'string') return sprache === 'fr' ? (STUFE_FR[wert] ?? wert) : wert
  if (typeof wert === 'boolean') return wert ? (sprache === 'fr' ? 'oui' : 'ja') : sprache === 'fr' ? 'non' : 'nein'
  if (Array.isArray(wert)) return wert.map(String).join(', ')
  if (feld.endsWith('_rappen') && typeof wert === 'number') return formatChf(wert, { mitWaehrung: true })
  if (typeof wert === 'string' && /^\d{4}-\d{2}-\d{2}/.test(wert) && (DATUM.test(feld) || wert.length > 10)) {
    return wert.length > 10 && !/T00:00:00/.test(wert) ? formatDatumZeit(wert) : formatDatum(wert.slice(0, 10))
  }
  if (typeof wert === 'number') return String(wert)
  return typeof wert === 'string' ? wert : JSON.stringify(wert)
}

/** Ist das Feld eine Zahl, die rechtsbündig steht? */
export function rechtsbuendig(feld: string): boolean {
  return feld.endsWith('_rappen') || feld.endsWith('_kwp') || feld === 'mahnstufe' || feld === 'kundennummer'
}

/** Tausendstel-Rappen als «CHF 0.04» (kleine Beträge der KI). */
export function chfAusMillirappen(m: number): string {
  return formatChf(Math.round(m / 1000), { mitWaehrung: true })
}
