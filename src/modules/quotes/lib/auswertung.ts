import type { Offerte } from '../types'
import { heuteIso, tageZwischen } from './nachfassen'

/** Zahlen einer Person (oder «alle») im gewählten Zeitraum. */
export interface AuswertungZeile {
  name: string
  offeriert: number
  offeriertRappen: number
  gewonnen: number
  gewonnenRappen: number
  verloren: number
  /** Gewonnen in % der Entschiedenen, null ohne Entscheid. */
  quote: number | null
  /** Ø Kalendertage vom Senden bis zum Entscheid (nur Entschiedene). */
  tageBisEntscheid: number | null
}

/** Auswertung der Offerten: Summe, je Person, Verlustgründe und Konkurrenz. */
export interface Auswertung {
  total: AuswertungZeile
  personen: AuswertungZeile[]
  verlustgruende: { grund: string; anzahl: number }[]
  konkurrenz: { name: string; anzahl: number }[]
}

function zeile(name: string, liste: Offerte[], tage: number, heute: string): AuswertungZeile {
  const imZeitraum = (d: string | null) => !!d && tageZwischen(d.slice(0, 10), heute) <= tage
  const offeriert = liste.filter((o) => imZeitraum(o.angebotAm))
  const entschieden = liste.filter(
    (o) => (o.phase === 'gewonnen' || o.phase === 'verloren') && imZeitraum(o.entscheidAm),
  )
  const gewonnen = entschieden.filter((o) => o.phase === 'gewonnen')
  const dauer = entschieden
    .filter((o) => o.angebotAm && o.entscheidAm)
    .map((o) => tageZwischen(o.angebotAm ?? '', (o.entscheidAm ?? '').slice(0, 10)))
  const summe = (l: Offerte[]) => l.reduce((s, o) => s + (o.betragRappen ?? 0), 0)
  return {
    name,
    offeriert: offeriert.length,
    offeriertRappen: summe(offeriert),
    gewonnen: gewonnen.length,
    gewonnenRappen: summe(gewonnen),
    verloren: entschieden.length - gewonnen.length,
    quote: entschieden.length ? Math.round((gewonnen.length * 100) / entschieden.length) : null,
    tageBisEntscheid: dauer.length ? Math.round(dauer.reduce((a, b) => a + b, 0) / dauer.length) : null,
  }
}

function zaehle(werte: string[]): { wert: string; anzahl: number }[] {
  const m = new Map<string, number>()
  for (const w of werte) m.set(w, (m.get(w) ?? 0) + 1)
  return [...m]
    .map(([wert, anzahl]) => ({ wert, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.wert.localeCompare(b.wert))
}

/**
 * Rechnet die Auswertung der letzten `tage` Tage: offeriert zählt nach Angebotsdatum, gewonnen/verloren nach
 * Entscheiddatum. Je Person nach «Offerte» (verantwortlich), ohne Person unter `ohne`. Verlustgründe und Konkurrenz
 * nur aus verlorenen Offerten im Zeitraum (Konkurrenz auch bei gewonnenen, damit man sieht, gegen wen man gewinnt).
 */
export function auswertung(offerten: Offerte[], tage: number, ohne: string, heute = heuteIso()): Auswertung {
  const personen = new Map<string, Offerte[]>()
  for (const o of offerten) {
    const n = o.verantwortlichName ?? ohne
    personen.set(n, [...(personen.get(n) ?? []), o])
  }
  const imZeitraum = (o: Offerte) => !!o.entscheidAm && tageZwischen(o.entscheidAm.slice(0, 10), heute) <= tage
  const verloren = offerten.filter((o) => o.phase === 'verloren' && imZeitraum(o))
  const mitKonkurrenz = offerten.filter((o) => (o.phase === 'verloren' || o.phase === 'gewonnen') && imZeitraum(o))
  return {
    total: zeile('', offerten, tage, heute),
    personen: [...personen]
      .map(([name, liste]) => zeile(name, liste, tage, heute))
      .filter((z) => z.offeriert > 0 || z.gewonnen + z.verloren > 0)
      .sort((a, b) => b.gewonnenRappen - a.gewonnenRappen || a.name.localeCompare(b.name)),
    verlustgruende: zaehle(verloren.map((o) => o.verlustgrund?.trim() || '–')).map((x) => ({
      grund: x.wert,
      anzahl: x.anzahl,
    })),
    konkurrenz: zaehle(mitKonkurrenz.map((o) => o.konkurrenz?.trim() ?? '').filter(Boolean)).map((x) => ({
      name: x.wert,
      anzahl: x.anzahl,
    })),
  }
}
