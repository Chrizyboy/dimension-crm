import type { Fakt, Vergleich, Zeitraum } from '../types'

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
  if (z === 'woche') return { von: montagVon(heute), bis }
  if (z === 'monat') return { von: iso(j, m - 1, 1), bis }
  if (z === 'quartal') return { von: iso(j, Math.floor((m - 1) / 3) * 3, 1), bis }
  if (z === 'jahr') return { von: iso(j, 0, 1), bis }
  if (z === '12m') return { von: iso(j - 1, m - 1, Number(heute.slice(8)) + 1), bis }
  return { von: '2000-01-01', bis }
}

/** Montag der Woche eines Datums (ISO-Woche beginnt am Montag). */
export function montagVon(datum: string): string {
  const d = new Date(`${datum}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** Datum um n Tage verschoben. */
export function plusTage(datum: string, n: number): string {
  const d = new Date(`${datum}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Tage von bis bis, beide eingeschlossen. */
export function tageZwischen(von: string, bis: string): number {
  return Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${von}T00:00:00Z`)) / 86_400_000) + 1
}

/** Gleiches Datum ein Jahr früher; der 29. Februar wird zum 28. */
export function vorjahr(datum: string): string {
  const j = Number(datum.slice(0, 4)) - 1
  const md = datum.slice(5) === '02-29' ? '02-28' : datum.slice(5)
  return `${String(j)}-${md}`
}

/**
 * Vergleichszeitraum: gleiche Tage im Vorjahr oder gleich viele Tage direkt davor. «Alles» hat keinen Vergleich.
 */
export function vergleichVon(z: Zeitraum, v: Vergleich, von: string, bis: string): { von: string; bis: string } | null {
  if (z === 'alle') return null
  if (v === 'vorjahr') return { von: vorjahr(von), bis: vorjahr(bis) }
  return { von: plusTage(von, -tageZwischen(von, bis)), bis: plusTage(von, -1) }
}

/** Kalenderwoche nach ISO 8601. */
export function kalenderwoche(datum: string): number {
  const d = new Date(`${datum}T00:00:00Z`)
  // Donnerstag derselben Woche bestimmt das Jahr der Woche.
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const jahresbeginn = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - jahresbeginn) / 86_400_000 + 1) / 7)
}

/** Fach für das Balkendiagramm: Woche/Monat → Tage, Quartal → Wochen, Jahr/12 Monate → Monate, alles → Quartale. */
export function fachVon(z: Zeitraum, datum: string): string {
  if (z === 'monat' || z === 'woche') return datum
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
  if (z === 'monat' || z === 'woche') return `${fach.slice(8)}.${fach.slice(5, 7)}.`
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
