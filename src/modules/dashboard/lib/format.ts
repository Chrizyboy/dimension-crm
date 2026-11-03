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

/** Zahl mit Schweizer Tausendertrennung («1'214», «12.4»). */
export function zahl(wert: number, stellen = 0): string {
  const [ganz = '0', rest] = Math.abs(wert).toFixed(stellen).split('.')
  const mitTrenner = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return `${wert < 0 ? '−' : ''}${mitTrenner}${rest ? `.${rest}` : ''}`
}

/** Kurzer Betrag für Achsen und enge Zellen: «2.98 Mio», «312k», «850». */
export function kurz(rappen: number): string {
  const chf = rappen / 100
  if (Math.abs(chf) >= 1_000_000) return `${(chf / 1_000_000).toFixed(2)} Mio`
  if (Math.abs(chf) >= 10_000) return `${String(Math.round(chf / 1000))}k`
  return zahl(Math.round(chf))
}

/** Tage mit einer Stelle oder Strich. */
export function tageText(tage: number | null): string {
  return tage === null ? '–' : zahl(tage, tage % 1 === 0 ? 0 : 1)
}
