import { formatChf } from '@/lib/format'
import type { Mass } from './auswertung'

/** Betrag auf ganze Franken für Übersichten: CHF 12'500 (Details zeigen Rappen). */
export function franken(rappen: number): string {
  return `CHF ${formatChf(Math.round(rappen / 100) * 100).slice(0, -3)}`
}

/** Zellwert je nach Mass: Anzahl, Franken oder Prozent; ohne Wert ein Strich. */
export function wertText(wert: number | null, mass: Mass): string {
  if (wert === null) return '–'
  if (mass === 'summe') return franken(wert)
  if (mass === 'quote') return `${String(wert)} %`
  return String(wert)
}
