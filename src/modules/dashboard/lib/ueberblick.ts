import type { Fakt, Zeitraum } from '../types'
import { summe } from './auswertung'
import type { ZielArt } from './ziele'
import { alleFaecher, fachText, fachVon } from './zeitraum'

/** Zielart aus den Filtern: gewählte Person, sonst die Firma. */
export function zielArtVon(bereich: 'alle' | 'muri' | 'bulle', person: string | null): ZielArt {
  return person ? { art: 'person', id: person } : { art: 'bereich', bereich }
}

/**
 * Kumulierte Werte je Fach für das Liniendiagramm: Zeitraum, Vergleich (gleich viele Fächer) und Ziel als Gerade.
 * «Alles» beginnt beim ersten Datum.
 */
export function kumulierteLinien(
  jetzt: readonly Fakt[],
  vorher: readonly Fakt[] | null,
  z: Zeitraum,
  von: string,
  bis: string,
  vergleich: { von: string; bis: string } | null,
  ziel: number | null,
) {
  const start =
    z === 'alle'
      ? (jetzt
          .map((f) => f.datum)
          .filter((d): d is string => !!d)
          .sort()[0] ?? von)
      : von
  const faecher = alleFaecher(z, start, bis)
  const kum = (fakten: readonly Fakt[], liste: string[]) => {
    let s = 0
    return liste.map((fach) => (s += summe(fakten.filter((f) => f.datum && fachVon(z, f.datum) === fach))))
  }
  const vFaecher = vergleich ? alleFaecher(z, vergleich.von, vergleich.bis).slice(0, faecher.length) : []
  return {
    faecher,
    beschriftung: faecher.map((f) => fachText(z, f)),
    jetzt: kum(jetzt, faecher),
    vorher: vorher && vergleich ? kum(vorher, vFaecher) : null,
    ziel: ziel === null ? null : faecher.map((_, i) => Math.round((ziel * (i + 1)) / faecher.length)),
  }
}
