import type { Fakt, Zeitraum } from '../types'

/** Heute in Zürich als JJJJ-MM-TT (sonst wechselt der Tag nach UTC um 1 oder 2 Uhr). */
export function heuteZuerich(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** ISO-Datum JJJJ-MM-TT ohne Zeitzonen-Verschiebung. */
function iso(j: number, m: number, t: number): string {
  return new Date(Date.UTC(j, m, t)).toISOString().slice(0, 10)
}

/** Von/bis eines Zeitraums ab heute (V233: laufender Monat, laufendes Quartal, laufendes Jahr, 12 Monate, alles). */
export function vonBis(z: Zeitraum, heute: string): { von: string; bis: string } {
  const [j, m] = heute.split('-').map(Number) as [number, number]
  const bis = heute
  if (z === 'monat') return { von: iso(j, m - 1, 1), bis }
  if (z === 'quartal') return { von: iso(j, Math.floor((m - 1) / 3) * 3, 1), bis }
  if (z === 'jahr') return { von: iso(j, 0, 1), bis }
  if (z === '12m') return { von: iso(j - 1, m - 1, Number(heute.slice(8)) + 1), bis }
  return { von: '2000-01-01', bis }
}

/** Kalenderwoche nach ISO 8601. */
export function kalenderwoche(datum: string): number {
  const d = new Date(`${datum}T00:00:00Z`)
  // Donnerstag derselben Woche bestimmt das Jahr der Woche.
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const jahresbeginn = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - jahresbeginn) / 86_400_000 + 1) / 7)
}

/** Fach für das Balkendiagramm: Monat → Tage, Quartal → Wochen, Jahr/12 Monate → Monate, alles → Quartale. */
export function fachVon(z: Zeitraum, datum: string): string {
  if (z === 'monat') return datum
  if (z === 'quartal') {
    const d = new Date(`${datum}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
    return d.toISOString().slice(0, 10)
  }
  if (z === 'alle') return `${datum.slice(0, 4)}-Q${String(Math.floor((Number(datum.slice(5, 7)) - 1) / 3) + 1)}`
  return datum.slice(0, 7)
}

/** Beschriftung eines Fachs: 26.10., KW 44, 10.2026, Q4 2026. */
export function fachText(z: Zeitraum, fach: string): string {
  if (z === 'monat') return `${fach.slice(8)}.${fach.slice(5, 7)}.`
  if (z === 'quartal') return `KW ${String(kalenderwoche(fach))}`
  if (z === 'alle') return `${fach.slice(5)} ${fach.slice(0, 4)}`
  return `${fach.slice(5, 7)}.${fach.slice(0, 4)}`
}

/** Alle Fächer zwischen von und bis, auch leere (sonst fehlen Lücken im Diagramm). */
export function alleFaecher(z: Zeitraum, von: string, bis: string): string[] {
  const faecher: string[] = []
  const d = new Date(`${von}T00:00:00Z`)
  const ende = new Date(`${bis}T00:00:00Z`)
  while (d <= ende) {
    const f = fachVon(z, d.toISOString().slice(0, 10))
    if (faecher.at(-1) !== f) faecher.push(f)
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return faecher
}

/** Gesendete Offerten pro Fach und Standort (V233 «Gesendete Offerten»). */
export function balken(fakten: Fakt[], z: Zeitraum, von: string, bis: string) {
  const start =
    z === 'alle'
      ? (fakten
          .map((f) => f.datum)
          .filter(Boolean)
          .sort()[0] ?? von)
      : von
  const faecher = alleFaecher(z, start, bis)
  const zahl = new Map(faecher.map((f) => [f, { muri: [] as Fakt[], bulle: [] as Fakt[] }]))
  for (const f of fakten) {
    if (f.schluessel !== 'gesendet' || !f.datum) continue
    const fach = zahl.get(fachVon(z, f.datum))
    if (fach && (f.standort === 'muri' || f.standort === 'bulle')) fach[f.standort].push(f)
  }
  return faecher.map((f) => ({ fach: f, text: fachText(z, f), ...(zahl.get(f) ?? { muri: [], bulle: [] }) }))
}
