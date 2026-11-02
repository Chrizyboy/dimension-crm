import type { ServiceFall } from '../types'

/** Stände, in denen die Reaktionszeit läuft (noch kein Termin, keine Teile bestellt, nicht erledigt). */
const LAEUFT = new Set(['neu', 'bearbeitung', 'kunde'])

/** Stand der Reaktionszeit eines Falls: läuft sie, ist sie um, wie viele Minuten bleiben (negativ = zu spät). */
export function reaktion(
  f: Pick<ServiceFall, 'status' | 'reaktion_bis'>,
  jetzt: Date = new Date(),
): { laeuft: boolean; ueberfaellig: boolean; minuten: number | null } {
  if (!f.reaktion_bis || !LAEUFT.has(f.status)) return { laeuft: false, ueberfaellig: false, minuten: null }
  const minuten = Math.round((new Date(f.reaktion_bis).getTime() - jetzt.getTime()) / 60_000)
  return { laeuft: true, ueberfaellig: minuten < 0, minuten }
}

/** «5 h 48 min», «2 T 3 h» oder «12 min»; ohne Vorzeichen. */
export function dauerText(minuten: number): string {
  const m = Math.abs(minuten)
  if (m >= 48 * 60) return `${String(Math.floor(m / 1440))} T ${String(Math.floor((m % 1440) / 60))} h`
  if (m >= 60) return `${String(Math.floor(m / 60))} h ${String(m % 60)} min`
  return `${String(m)} min`
}

/** Ist ein Datum (ISO) in der laufenden Kalenderwoche (Montag bis Sonntag)? */
export function inDieserWoche(iso: string | null, jetzt: Date = new Date()): boolean {
  if (!iso) return false
  const montag = new Date(jetzt)
  montag.setHours(0, 0, 0, 0)
  montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7))
  const d = new Date(iso).getTime()
  return d >= montag.getTime() && d < montag.getTime() + 7 * 86_400_000
}
