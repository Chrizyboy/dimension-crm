import type { Belegung } from '../types'
import { tageBis } from './fristen'

/** Datum plus n Tage (Kalendertage, JJJJ-MM-TT). */
export function plusTage(datum: string, n: number): string {
  const d = new Date(`${datum}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Montag der Woche, in der das Datum liegt. */
export function montag(datum: string): string {
  const tag = new Date(`${datum}T12:00:00Z`).getUTCDay()
  return plusTage(datum, -((tag + 6) % 7))
}

/** Die Tage ab «von», n Stück. */
export const tage = (von: string, n: number): string[] => Array.from({ length: n }, (_, i) => plusTage(von, i))

/** Schlüssel der Sache, die belegt ist (Fahrzeug oder Gerät). */
export const sache = (b: Pick<Belegung, 'fahrzeug_id' | 'geraet_id'>): string =>
  b.fahrzeug_id ? `f:${b.fahrzeug_id}` : `g:${b.geraet_id ?? ''}`

/** Belegungen am Tag. */
export const amTag = (liste: Belegung[], tag: string): Belegung[] => liste.filter((b) => b.von <= tag && b.bis >= tag)

/** Eindeutiger Schlüssel einer Belegungszeile. */
export const zeilenSchluessel = (b: Belegung): string =>
  b.reservierung_id ?? `auto:${b.einsatz_id ?? ''}:${b.fahrzeug_id ?? ''}`

/**
 * Doppelte Belegungen: dieselbe Sache am selben Tag zweimal. Gibt pro Sache die Tage mit Konflikt zurück
 * (nur im Zeitraum von–bis), damit Plan und «Zu erledigen» dieselbe Regel nutzen.
 */
export function konflikte(liste: Belegung[], von: string, bis: string): Map<string, string[]> {
  const ergebnis = new Map<string, string[]>()
  for (const tag of tage(von, tageBis(bis, von) + 1)) {
    const proSache = new Map<string, number>()
    for (const b of amTag(liste, tag)) proSache.set(sache(b), (proSache.get(sache(b)) ?? 0) + 1)
    for (const [s, n] of proSache) if (n > 1) ergebnis.set(s, [...(ergebnis.get(s) ?? []), tag])
  }
  return ergebnis
}
