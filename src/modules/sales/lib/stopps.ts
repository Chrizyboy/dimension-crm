import type { Stopp } from './ablauf'
import type { Belegt } from './route'
import type { Geschaeft } from '../types'

/** Erreichbarkeit aus dem Lead als Zeitfenster in Minuten (V233 reach). */
const FENSTER: Record<string, readonly [number, number]> = {
  vormittag: [8 * 60, 12 * 60],
  mittag: [11 * 60 + 30, 14 * 60],
  nachmittag: [13 * 60, 18 * 60],
  abends: [17 * 60, 20 * 60],
}

/** Minuten seit Mitternacht in Schweizer Zeit. */
export function minutenAm(iso: string): number {
  const [h, m] = new Date(iso)
    .toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })
    .split(':')
  return Number(h) * 60 + Number(m)
}

/** Datum (ISO) eines Zeitpunkts in Schweizer Zeit. */
export function tagVon(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** Ein Geschäft als Halt der Route; ohne Lage gibt es keinen Halt. Mit `fix` als fester Termin. */
export function alsStopp(g: Geschaeft, besuchMin: number, fix = false): Stopp | null {
  if (g.breite === null || g.laenge === null) return null
  return {
    id: g.id,
    name: g.name,
    adresse: [g.strasse, [g.plz, g.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    breite: g.breite,
    laenge: g.laenge,
    fix: fix && g.terminAm ? minutenAm(g.terminAm) : null,
    besuchMin: fix ? (g.terminDauerMin ?? besuchMin) : besuchMin,
    fenster: g.erreichbarkeit ? (FENSTER[g.erreichbarkeit] ?? null) : null,
  }
}

/** Kalendereintrag eines Tages als Halt (mit Ort) oder als belegte Zeit (ohne Ort). */
export function ausKalender(e: {
  id: string
  beginn: string
  ende: string
  ganztags: boolean
  betreff: string
  ort: string
  breite: number | null
  laenge: number | null
  anzeige_als: string
}): { stopp: Stopp | null; belegt: Belegt | null } {
  if (e.anzeige_als === 'free') return { stopp: null, belegt: null }
  const start = e.ganztags ? 0 : minutenAm(e.beginn)
  const ende = e.ganztags ? 24 * 60 : Math.max(start + 15, minutenAm(e.ende))
  if (e.breite !== null && e.laenge !== null && !e.ganztags)
    return {
      stopp: {
        id: `kal-${e.id}`,
        name: e.betreff || e.ort,
        adresse: e.ort,
        breite: e.breite,
        laenge: e.laenge,
        fix: start,
        besuchMin: ende - start,
        ausKalender: true,
      },
      belegt: null,
    }
  return { stopp: null, belegt: { start, ende, betreff: e.betreff || '–' } }
}

/**
 * Freie Zeitfenster eines Tages zwischen belegten Blöcken (V233 Kalender «freie Fenster»):
 * nur Fenster, in die ein Besuch samt Anfahrt passt.
 */
export function freieFenster(
  belegt: readonly { start: number; ende: number }[],
  von = 8 * 60,
  bis = 17 * 60,
  mindestens = 90,
): { start: number; ende: number }[] {
  const sortiert = [...belegt].sort((a, b) => a.start - b.start)
  const frei: { start: number; ende: number }[] = []
  let t = von
  for (const b of sortiert) {
    if (b.ende <= t) continue
    if (b.start - t >= mindestens) frei.push({ start: t, ende: Math.min(b.start, bis) })
    t = Math.max(t, b.ende)
    if (t >= bis) break
  }
  if (bis - t >= mindestens) frei.push({ start: t, ende: bis })
  return frei.filter((f) => f.ende - f.start >= mindestens)
}
