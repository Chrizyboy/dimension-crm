/**
 * Zeitplan einer Route: Abfahrt, Fahrten, Ladehalte, Ankunft und Beginn jedes Besuchs, Puffer und Warnungen.
 * Gemeinsam für Tagesroute und Tour (V233 computeDay und computeTour hatten je eine eigene Kopie).
 */
import type { Punkt } from '../types'
import { ab15, auf15, fahrt, km, planeLaden, weichAus, zuMinuten, type Belegt, type Strecke, type TourEinstellungen } from './route'

/** Ein Halt der Route: Lead, eingefügte Adresse oder Termin aus dem Kalender. */
export interface Stopp extends Punkt {
  id: string
  name: string
  adresse: string
  /** Feste Uhrzeit in Minuten (Termin), sonst plant das CRM einen Vorschlag. */
  fix: number | null
  besuchMin: number
  /** Erreichbarkeit des Kunden, z. B. Vormittag [480, 720]. */
  fenster?: readonly [number, number] | null
  ausKalender?: boolean
}

/** Start oder Ziel (Standort, Zuhause, anderer Ort). */
export interface Ort extends Punkt {
  name: string
  adresse: string
}

export interface AblaufZeile {
  stopp: Stopp
  nr: number
  ankunft: number
  beginn: number
  geplant: number
  /** Minuten zwischen Ankunft und Beginn; negativ = zu spät. */
  puffer: number
  besuchMin: number
  ende: number
  ueberschneidet: Belegt | null
  ausserhalbFenster: boolean
  zuSpaet: boolean
  mittag: boolean
}

export interface Ablauf {
  abfahrt: number
  zeilen: AblaufZeile[]
  /** Strecken in Reihenfolge: Start→1, 1→2 … (→ Ziel). */
  strecken: (Strecke & { schluessel: string; geschaetzt: number })[]
  ankunft: number | null
  totalKm: number
  totalMin: number
  ladenMin: number
}

export interface AblaufEingabe {
  start: Ort
  stopps: readonly Stopp[]
  ziel: Ort | null
  e: TourEinstellungen
  belegt?: readonly Belegt[]
  /** Abfahrt in Minuten; ohne richtet sie sich nach dem ersten festen Termin. */
  abfahrt?: number | null
  /** Von Hand korrigierte Fahrzeiten je Strecke (Schlüssel «von>nach»). */
  fahrzeiten?: Readonly<Record<string, number>>
}

const schluessel = (a: { id?: string; name: string }, b: { id?: string; name: string }) =>
  `${a.id ?? a.name}>${b.id ?? b.name}`

/** Rechnet den Ablauf einer Route in der gegebenen Reihenfolge. */
export function planeAblauf({ start, stopps, ziel, e, belegt = [], abfahrt = null, fahrzeiten = {} }: AblaufEingabe): Ablauf {
  const folge: (Ort | Stopp)[] = [start, ...stopps, ...(ziel ? [ziel] : [])]
  const roh = folge.slice(0, -1).map((a, i) => {
    const b = folge[i + 1] as Ort | Stopp
    const f = fahrt(a, b, e)
    const k = schluessel(a, b)
    return { ...f, min: fahrzeiten[k] ?? f.min, schluessel: k, geschaetzt: f.min }
  })
  const geladen = planeLaden(roh, e.auto)
  const strecken = roh.map((r, i) => ({ ...(geladen[i] as Strecke), schluessel: r.schluessel, geschaetzt: r.geschaetzt }))
  const laden = (i: number) => strecken[i]?.laden?.min ?? 0
  const erster = stopps[0]
  let ab = abfahrt ?? 8 * 60 + 30
  if (erster?.fix != null) ab = ab15(erster.fix - (strecken[0]?.min ?? 0) - laden(0) - e.puffer_min)
  else if (abfahrt == null) ab = ab15(8 * 60 + 30 - (strecken[0]?.min ?? 0) - e.puffer_min)
  const spaetestens = zuMinuten(e.spaetestens) ?? 17 * 60
  let t = ab
  const zeilen = stopps.map((s, i): AblaufZeile => {
    t += laden(i) + (strecken[i]?.min ?? 0)
    const ankunft = t
    const geplant = s.fix ?? weichAus(auf15(ankunft + e.puffer_min), s.besuchMin, belegt, e.puffer_min)
    const beginn = Math.max(geplant, ankunft)
    const ueberschneidet = s.ausKalender ? null : (belegt.find((b) => geplant < b.ende && geplant + s.besuchMin > b.start) ?? null)
    const puffer = geplant - ankunft
    t = beginn + s.besuchMin
    return {
      stopp: s,
      nr: i + 1,
      ankunft,
      beginn,
      geplant,
      puffer,
      besuchMin: s.besuchMin,
      ende: t,
      ueberschneidet,
      ausserhalbFenster: s.fenster ? geplant < s.fenster[0] || geplant > s.fenster[1] : false,
      zuSpaet: s.fix == null && geplant > spaetestens,
      mittag: puffer >= 45 && ankunft < 13.5 * 60 && geplant > 11.5 * 60,
    }
  })
  let ankunft: number | null = null
  if (ziel && stopps.length) {
    const i = strecken.length - 1
    t += laden(i) + (strecken[i]?.min ?? 0)
    ankunft = t
  }
  return {
    abfahrt: ab,
    zeilen,
    strecken,
    ankunft,
    totalKm: strecken.reduce((x, s) => x + s.km, 0),
    totalMin: strecken.reduce((x, s) => x + s.min, 0),
    ladenMin: strecken.reduce((x, s) => x + (s.laden?.min ?? 0), 0),
  }
}

/**
 * Fügt flexible Stopps zwischen feste Termine ein, dort wo die Fahrt am kürzesten bleibt und kein Termin
 * zu spät wird (V233 planAroundFixed). Was nicht passt, kommt in `passtNicht`.
 */
export function planeUmFixe(
  start: Ort,
  fixe: readonly Stopp[],
  flexible: readonly Stopp[],
  ziel: Ort | null,
  e: TourEinstellungen,
  belegt: readonly Belegt[],
  abfahrt: number | null,
): { folge: Stopp[]; passtNicht: Stopp[] } {
  let folge = [...fixe].sort((a, b) => (a.fix ?? 0) - (b.fix ?? 0))
  const rest = [...flexible]
  const passtNicht: Stopp[] = []
  while (rest.length) {
    let beste: { s: Stopp; pos: number; kosten: number } | null = null
    for (const s of rest) {
      for (let pos = 0; pos <= folge.length; pos++) {
        const versuch = [...folge.slice(0, pos), s, ...folge.slice(pos)]
        const a = planeAblauf({ start, stopps: versuch, ziel, e, belegt, abfahrt })
        const zuSpaet = a.zeilen.some((z) => z.puffer < 0 || z.zuSpaet)
        if (zuSpaet) continue
        if (!beste || a.totalMin < beste.kosten) beste = { s, pos, kosten: a.totalMin }
      }
    }
    if (!beste) {
      passtNicht.push(...rest)
      break
    }
    const { s, pos } = beste
    folge = [...folge.slice(0, pos), s, ...folge.slice(pos)]
    rest.splice(rest.indexOf(s), 1)
  }
  return { folge, passtNicht }
}

/** Liegt ein Punkt näher als `maxKm` an einem anderen (z. B. Kalendertermin = derselbe Kunde)? */
export function nahe(a: Punkt, b: Punkt, maxKm = 0.5): boolean {
  return km(a, b) <= maxKm
}

/** Zeilen für Excel (Tabulator getrennt), wie «Für Excel kopieren» in V233. */
export function alsTabelle(datum: string, start: Ort, a: Ablauf, hmText: (m: number) => string): string {
  const zeilen = [['Datum', 'Abfahrt', 'Ort', 'Fahrt', 'Ankunft', 'Termin', 'Ort'].join('\t')]
  let von = start.name
  let los = a.abfahrt
  a.strecken.forEach((s, i) => {
    const z = a.zeilen[i]
    const nach = z ? z.stopp.name : 'Ziel'
    const l = s.laden?.min ?? 0
    if (l && s.laden) zeilen.push([i === 0 ? datum : '', hmText(los), von, hmText(l), hmText(los + l), '', `Laden ${s.laden.von}→${s.laden.bis} %`].join('\t'))
    zeilen.push([i === 0 && !l ? datum : '', hmText(los + l), von, hmText(s.min), hmText(los + l + s.min), z ? hmText(z.geplant) : '', nach].join('\t'))
    if (z) {
      von = z.stopp.name
      los = z.ende
    }
  })
  return zeilen.join('\n')
}
