/**
 * Rechnen für Tagesroute und Tour, übernommen aus V233 (computeDay, computeTour, optimize, evPlan).
 * Fahrzeiten sind Schätzungen aus der Luftlinie mit Umwegfaktor; genaue Fahrzeiten aus einem
 * Kartendienst kommen mit den Integrationen (Phase 8) dazu.
 */
import type { Punkt } from '../types'

/** Einstellungen der Tourplanung (Tabelle einstellungen, Schlüssel «tourplanung»). */
export interface TourEinstellungen {
  tempo_kmh: number
  umweg_faktor: number
  zuschlag_min: number
  besuch_min: number
  puffer_min: number
  spaetestens: string
  abfahrt: string
  auto: {
    aktiv: boolean
    kwh: number
    verbrauch: number
    start: number
    reserve: number
    ziel: number
    kw: number
    zuschlag: number
  }
}

export const STANDARD_TOUR: TourEinstellungen = {
  tempo_kmh: 70,
  umweg_faktor: 1.35,
  zuschlag_min: 8,
  besuch_min: 60,
  puffer_min: 10,
  spaetestens: '17:00',
  abfahrt: '08:00',
  auto: { aktiv: true, kwh: 64.7, verbrauch: 25, start: 100, reserve: 15, ziel: 80, kw: 90, zuschlag: 10 },
}

/** Luftlinie in Kilometern (Haversine). */
export function km(a: Punkt, b: Punkt): number {
  const r = Math.PI / 180
  const dLa = (b.breite - a.breite) * r
  const dLo = (b.laenge - a.laenge) * r
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.breite * r) * Math.cos(b.breite * r) * Math.sin(dLo / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** Geschätzte Fahrt: Strecke × Umwegfaktor, bei Tempo X plus fester Zuschlag fürs Parkieren. */
export function fahrt(a: Punkt, b: Punkt, e: TourEinstellungen): { km: number; min: number } {
  const d = km(a, b) * e.umweg_faktor
  if (d < 0.8) return { km: d, min: d < 0.05 ? 0 : 4 }
  return { km: d, min: Math.round((d / e.tempo_kmh) * 60 + e.zuschlag_min) }
}

/** Minuten seit Mitternacht → «08:30». */
export function hm(minuten: number): string {
  const m = Math.round(minuten)
  const neg = m < 0
  const a = Math.abs(m)
  return `${neg ? '-' : ''}${String(Math.floor(a / 60) % 24).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`
}

/** Dauer als «45 Min» oder «1 h 05». */
export function dauer(minuten: number): string {
  const m = Math.round(minuten)
  if (m < 60) return `${m} Min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

/** «08:30» → 510; ungültig → null. */
export function zuMinuten(zeit: string | null | undefined): number | null {
  const m = /^(\d{1,2})[:.](\d{2})/.exec(zeit ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Auf die nächste Viertelstunde auf- bzw. abrunden (Termine immer im 15-Minuten-Raster). */
export const auf15 = (m: number) => Math.ceil(Math.round(m) / 15) * 15
export const ab15 = (m: number) => Math.floor(Math.round(m) / 15) * 15

/**
 * Reihenfolge mit kürzester Strecke: nächster Nachbar, danach 2-opt (Teilstücke umdrehen, solange es kürzer wird).
 * Ohne Ziel endet die Tour beim letzten Stopp.
 */
export function optimiere<T extends Punkt>(start: Punkt, punkte: readonly T[], ziel: Punkt | null): T[] {
  if (punkte.length < 2) return [...punkte]
  const rest = [...punkte]
  const folge: T[] = []
  let jetzt: Punkt = start
  while (rest.length) {
    let bi = 0
    let bd = Infinity
    rest.forEach((p, i) => {
      const d = km(jetzt, p)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    const naechster = rest.splice(bi, 1)[0] as T
    folge.push(naechster)
    jetzt = naechster
  }
  const laenge = (o: readonly T[]) => {
    let s = km(start, o[0] as T)
    for (let i = 0; i < o.length - 1; i++) s += km(o[i] as T, o[i + 1] as T)
    return ziel ? s + km(o[o.length - 1] as T, ziel) : s
  }
  let beste = folge
  let besteLaenge = laenge(folge)
  let besser = true
  for (let runde = 0; besser && runde < 200; runde++) {
    besser = false
    for (let i = 0; i < beste.length - 1; i++) {
      for (let k = i + 1; k < beste.length; k++) {
        const neu = [...beste.slice(0, i), ...beste.slice(i, k + 1).reverse(), ...beste.slice(k + 1)]
        const l = laenge(neu)
        if (l + 1e-9 < besteLaenge) {
          beste = neu
          besteLaenge = l
          besser = true
        }
      }
    }
  }
  return beste
}

/** Ein Block, in dem die Person schon belegt ist (Kalender), in Minuten des Tages. */
export interface Belegt {
  start: number
  ende: number
  betreff: string
}

/** Schiebt einen Besuch hinter belegte Zeiten (plus Puffer). */
export function weichAus(beginn: number, besuch: number, belegt: readonly Belegt[], puffer: number): number {
  let t = beginn
  for (let runde = 0; runde < 20; runde++) {
    const block = belegt.find((b) => t < b.ende && t + besuch > b.start)
    if (!block) return t
    t = auf15(block.ende + puffer)
  }
  return t
}

/** Ladezeit am Schnelllader: bis 80 % mit voller Leistung, danach langsamer (V233 chargeMinutes). */
export function ladeMinuten(vonKwh: number, bisKwh: number, auto: TourEinstellungen['auto']): number {
  const knie = 0.8 * auto.kwh
  const a = Math.max(0, Math.min(bisKwh, knie) - vonKwh)
  const b = Math.max(0, bisKwh - Math.max(vonKwh, knie))
  return Math.ceil(((a / auto.kw + b / (auto.kw * 0.45)) * 60) / 5) * 5 + auto.zuschlag
}

/** Eine Strecke der Route mit Ladehalt und Akkustand danach (Elektroauto, V233 evPlan). */
export interface Strecke {
  km: number
  min: number
  laden: { min: number; von: number; bis: number } | null
  akkuDanach: number | null
  reichtNicht: boolean
}

/** Plant Ladehalte: wird die Reserve unterschritten, vorher so weit laden, dass der Rest reicht. */
export function planeLaden(strecken: { km: number; min: number }[], auto: TourEinstellungen['auto']): Strecke[] {
  if (!auto.aktiv) return strecken.map((s) => ({ ...s, laden: null, akkuDanach: null, reichtNicht: false }))
  const reserve = (auto.kwh * auto.reserve) / 100
  let akku = (auto.kwh * Math.min(100, auto.start)) / 100
  const bedarf = strecken.map((s) => (s.km * auto.verbrauch) / 100)
  return strecken.map((s, i) => {
    const noetig = bedarf[i] ?? 0
    let laden: Strecke['laden'] = null
    if (akku - noetig < reserve) {
      const rest = bedarf.slice(i).reduce((x, y) => x + y, 0)
      const ziel = Math.min(
        auto.kwh,
        Math.max(noetig + reserve, Math.min((auto.kwh * auto.ziel) / 100, rest + reserve)),
      )
      if (ziel > akku + 0.5) {
        laden = {
          min: ladeMinuten(akku, ziel, auto),
          von: Math.round((akku / auto.kwh) * 100),
          bis: Math.round((ziel / auto.kwh) * 100),
        }
        akku = ziel
      }
    }
    akku -= noetig
    return { ...s, laden, akkuDanach: Math.round((akku / auto.kwh) * 100), reichtNicht: akku < 0 }
  })
}

/** Link zur Route in Google Maps; mehr als 9 Zwischenhalte teilt Google nicht, darum in Etappen. */
export function mapsLinks(adressen: readonly string[]): string[] {
  if (adressen.length < 2) return []
  const links: string[] = []
  for (let i = 0; i < adressen.length - 1; i += 10) {
    const teil = adressen.slice(i, i + 11)
    const e = encodeURIComponent
    const zwischen = teil.slice(1, -1)
    links.push(
      `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${e(teil[0] ?? '')}&destination=${e(teil[teil.length - 1] ?? '')}${zwischen.length ? `&waypoints=${e(zwischen.join('|'))}` : ''}`,
    )
  }
  return links
}
