/** Rechnen mit Arbeitszeiten. Angezeigt wird immer Schweizer Zeit, egal wo das Gerät eingestellt ist. */

const ZONE = 'Europe/Zurich'
const teile = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Datum (JJJJ-MM-TT) und Uhrzeit (HH:MM) eines Zeitpunkts in Schweizer Zeit. */
export function zuerich(zeitpunkt: string | Date): { datum: string; zeit: string } {
  const p = Object.fromEntries(teile.formatToParts(new Date(zeitpunkt)).map((x) => [x.type, x.value]))
  return { datum: `${p.year ?? ''}-${p.month ?? ''}-${p.day ?? ''}`, zeit: `${p.hour ?? ''}:${p.minute ?? ''}` }
}

/** Heutiges Datum in Schweizer Zeit (JJJJ-MM-TT). */
export function heute(jetzt: Date = new Date()): string {
  return zuerich(jetzt).datum
}

/** Tage, die «Mein Plan» der Monteure zeigt (heute und die nächsten 13). */
export const PLAN_TAGE = 14

/** Datum plus/minus Tage, ohne Zeitzonen-Sprünge (Rechnung in UTC auf dem reinen Datum). */
export function plusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Montag der Woche, in der das Datum liegt. */
export function wochenStart(datum: string): string {
  const tag = new Date(`${datum}T12:00:00Z`).getUTCDay()
  return plusTage(datum, -((tag + 6) % 7))
}

/** Gearbeitete Minuten: Stopp minus Start minus Pause; läuft die Zeit noch, bis jetzt. Nie negativ. */
export function minuten(z: { start: string; stopp: string | null; pause_min?: number | null }, jetzt = new Date()) {
  const ende = z.stopp ? new Date(z.stopp) : jetzt
  const roh = Math.floor((ende.getTime() - new Date(z.start).getTime()) / 60_000) - (z.pause_min ?? 0)
  return Math.max(0, roh)
}

/** Minuten als «7:05 h». */
export function dauerText(min: number): string {
  const h = Math.floor(min / 60)
  return `${String(h)}:${String(min % 60).padStart(2, '0')} h`
}

/** Stunden mit zwei Stellen, Punkt als Trennzeichen (für Export und Summen). */
export function stundenText(min: number): string {
  return (Math.round((min / 60) * 100) / 100).toFixed(2)
}

/** Summe der Minuten je Person, sortiert nach Name. */
export function summeJePerson(
  zeiten: {
    person_id: string
    person: string | null
    start: string
    stopp: string | null
    pause_min?: number | null
  }[],
): { person_id: string; person: string; minuten: number }[] {
  const summen = new Map<string, { person_id: string; person: string; minuten: number }>()
  for (const z of zeiten) {
    const s = summen.get(z.person_id) ?? { person_id: z.person_id, person: z.person ?? '–', minuten: 0 }
    s.minuten += minuten(z)
    summen.set(z.person_id, s)
  }
  return [...summen.values()].sort((a, b) => a.person.localeCompare(b.person))
}
