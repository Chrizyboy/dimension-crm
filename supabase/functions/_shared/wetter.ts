// Wetter auf den Baustellen (M5 A, Quelle M7 B, Entscheid 0050): lokale Prognose von MeteoSwiss Open Data
// (STAC-Sammlung «ch.meteoschweiz.ogd-local-forecasting» auf data.geo.admin.ch, gratis, ohne Schlüssel).
// Die Sammlung hat eine Tabelle der Prognose-Punkte (auch je Postleitzahl) und pro Lauf eine CSV je Parameter
// mit allen Punkten. Wir laden nur die Tageswerte, filtern auf unsere Postleitzahlen und speichern sie über
// `wetter_speichern`. Basis-Adresse über METEOSCHWEIZ_URL ersetzbar (Ersatz-Server in den Tests).

import { DienstFehler, leseJson, rufe } from './http.ts'
import { env } from './umgebung.ts'

const SAMMLUNG = '/api/stac/v1/collections/ch.meteoschweiz.ogd-local-forecasting'

/** Welche Spalte der CSV in welches Feld kommt (aus `einstellungen.wetter.parameter`). */
export type WetterParameter = Partial<
  Record<'tmin' | 'tmax' | 'regen_mm' | 'regen_prozent' | 'wind_kmh' | 'symbol', string>
>

/** Eine Zeile für `wetter_speichern`. */
export interface WetterZeile {
  plz: string
  datum: string
  tmin?: number
  tmax?: number
  regen_mm?: number
  regen_prozent?: number
  wind_kmh?: number
  symbol?: number
}

interface StacAsset {
  href: string
}
interface StacItem {
  id: string
  assets?: Record<string, StacAsset>
}

/** Liest eine CSV von MeteoSwiss (Strichpunkt, erste Zeile Kopf) als Liste von Objekten mit kleinen Spaltennamen. */
export function leseCsv(text: string): Record<string, string>[] {
  const zeilen = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((z) => z.trim())
  const kopf = (zeilen.shift() ?? '').split(';').map((k) => k.trim().toLowerCase())
  return zeilen.map((z) => {
    const werte = z.split(';')
    return Object.fromEntries(kopf.map((k, i) => [k, (werte[i] ?? '').trim()]))
  })
}

/**
 * Prognose-Punkt je Postleitzahl aus der Punkt-Tabelle. Gibt es zu einer PLZ mehrere Punkte (z. B. auch eine
 * Messstation), gewinnt der Punkt ohne Stationskürzel, denn der steht für die Postleitzahl selbst.
 */
export function punkteFuerPlz(meta: Record<string, string>[], plz: string[]): Map<string, string> {
  const gesucht = new Set(plz)
  const r = new Map<string, string>()
  for (const z of meta) {
    const p = z.postal_code ?? z.plz ?? ''
    const id = z.point_id ?? ''
    if (!gesucht.has(p) || !id) continue
    if (!r.has(p) || !z.station_abbr) r.set(p, id)
  }
  return r
}

/** «202511030000» oder «2025-11-03T00:00Z» → «2025-11-03». */
export function alsDatum(wert: string): string | null {
  const z = wert.replace(/\D/g, '')
  return z.length >= 8 ? `${z.slice(0, 4)}-${z.slice(4, 6)}-${z.slice(6, 8)}` : null
}

/** Zahl aus der CSV; leer, «-» oder unlesbar → undefined. */
function zahl(wert: string | undefined): number | undefined {
  if (!wert || wert === '-') return undefined
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/**
 * Trägt die Werte einer Parameter-CSV in die Zeilen ein (Schlüssel «plz|datum»). Spalte des Werts ist der
 * Parameter-Code, sonst die letzte Spalte (falls MeteoSwiss den Kopf anders schreibt).
 */
export function werteEintragen(
  ziel: Map<string, WetterZeile>,
  csv: Record<string, string>[],
  feld: keyof WetterParameter,
  code: string,
  punktZuPlz: Map<string, string>,
): number {
  let n = 0
  for (const z of csv) {
    const plz = punktZuPlz.get(z.point_id ?? '')
    if (!plz) continue
    const datum = alsDatum(z.date ?? '')
    const spalten = Object.keys(z)
    const wert = zahl(z[code.toLowerCase()] ?? z[spalten[spalten.length - 1] ?? ''])
    if (!datum || wert === undefined) continue
    const schluessel = `${plz}|${datum}`
    const zeile = ziel.get(schluessel) ?? { plz, datum }
    zeile[feld] = wert
    ziel.set(schluessel, zeile)
    n++
  }
  return n
}

/** Neueste Datei je Parameter-Code über alle Läufe (der Dateiname enthält die Laufzeit, darum genügt Sortieren). */
export function neuesteDateien(items: StacItem[], codes: string[]): Map<string, string> {
  const r = new Map<string, string>()
  for (const item of items) {
    for (const a of Object.values(item.assets ?? {})) {
      const name = a.href.split('/').pop() ?? ''
      for (const c of codes) {
        if (!name.toLowerCase().includes(`.${c.toLowerCase()}.`)) continue
        const bisher = r.get(c)
        if (!bisher || (bisher.split('/').pop() ?? '') < name) r.set(c, a.href)
      }
    }
  }
  return r
}

/** Zugriff auf die STAC-Schnittstelle von data.geo.admin.ch. */
export class MeteoSchweiz {
  constructor(private readonly basis = env('METEOSCHWEIZ_URL') ?? 'https://data.geo.admin.ch') {}

  private async hole(url: string): Promise<Response> {
    const res = await rufe(url.startsWith('http') ? url : `${this.basis}${url}`, {}, { zeitlimitMs: 20_000 })
    if (!res.ok) throw new DienstFehler('meteoschweiz', res.status, `MeteoSwiss ${res.status}`)
    return res
  }

  /** Adresse der Punkt-Tabelle (Asset der Sammlung, dessen Name «meta_point» enthält). */
  async punktTabelle(): Promise<string> {
    const d = await leseJson<{ assets?: Record<string, StacAsset> }>(await this.hole(SAMMLUNG))
    const a = Object.values(d?.assets ?? {}).find((x) => x.href.toLowerCase().includes('meta_point'))
    if (!a) throw new DienstFehler('meteoschweiz', 200, 'MeteoSwiss: Punkt-Tabelle fehlt')
    return a.href
  }

  /** Alle Läufe der Sammlung (höchstens 5 Seiten, die Prognosen bleiben nur kurz liegen). */
  async laeufe(): Promise<StacItem[]> {
    const r: StacItem[] = []
    let url: string | undefined = `${SAMMLUNG}/items?limit=100`
    for (let seite = 0; url && seite < 5; seite++) {
      const d: { features?: StacItem[]; links?: { rel: string; href: string }[] } | null = await leseJson(
        await this.hole(url),
      )
      r.push(...(d?.features ?? []))
      url = d?.links?.find((l) => l.rel === 'next')?.href
    }
    return r
  }

  /** Text einer Datei. */
  async text(url: string): Promise<string> {
    return (await this.hole(url)).text()
  }
}

/** Holt die Tageswerte für die Postleitzahlen und gibt die Zeilen für `wetter_speichern` zurück. */
export async function wetterHolen(
  plz: string[],
  parameter: WetterParameter,
  m = new MeteoSchweiz(),
): Promise<{ zeilen: WetterZeile[]; lauf: string | null; fehlend: string[] }> {
  if (plz.length === 0) return { zeilen: [], lauf: null, fehlend: [] }
  const punkte = punkteFuerPlz(leseCsv(await m.text(await m.punktTabelle())), plz)
  const punktZuPlz = new Map([...punkte].map(([p, id]) => [id, p]))
  const felder = Object.entries(parameter).filter(([, c]) => c) as [keyof WetterParameter, string][]
  const dateien = neuesteDateien(
    await m.laeufe(),
    felder.map(([, c]) => c),
  )
  const ziel = new Map<string, WetterZeile>()
  const fehlend: string[] = []
  let lauf: string | null = null
  for (const [feld, code] of felder) {
    const url = dateien.get(code)
    if (!url) {
      fehlend.push(code)
      continue
    }
    lauf ??= url.split('/').pop() ?? null
    werteEintragen(ziel, leseCsv(await m.text(url)), feld, code, punktZuPlz)
  }
  return { zeilen: [...ziel.values()], lauf, fehlend }
}
