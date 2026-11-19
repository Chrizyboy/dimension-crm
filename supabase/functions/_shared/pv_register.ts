// Bestehende PV-Anlagen aus dem Register der Elektrizitätsproduktionsanlagen des Bundes (api3.geo.admin.ch, Layer
// ch.bfe.elektrizitaetsproduktionsanlagen, offen, ohne Schlüssel). Der Grossprojekt-Monitor braucht das, damit er keine
// Dächer meldet, auf denen schon eine Anlage steht (Chris, 19.11.2026: «nur Projekte, die wirklich interessant sind»).
// Eine Anlage gehört zu einem Gebäude, wenn die EGID gleich ist oder sie nahe beim Gebäude liegt (die Lage im Register
// ist die Adresse, nicht die Dachmitte). Die Antworten des Bundes sind Daten (Regel 7).

import { dienst } from './datenbank.ts'
import { GeoAdmin, istDienstAusfall } from './gebaeude.ts'

const LAYER = 'ch.bfe.elektrizitaetsproduktionsanlagen'
const SEITE = 200

/** Eine PV-Anlage aus dem Register (nur was der Monitor braucht). */
export interface PvAnlage {
  egid: string | null
  kw: number
  e: number | null
  n: number | null
}

interface Treffer {
  properties?: Record<string, unknown>
  attributes?: Record<string, unknown>
  geometry?: { coordinates?: number[]; x?: number; y?: number }
}

/** «123.4 kW» oder 123.4 → 123.4; Unbrauchbares → 0. */
export function leistungKw(w: unknown): number {
  const n = typeof w === 'number' ? w : parseFloat(String(w ?? '').replace(/'/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Einträge des Registers lesen und nur Photovoltaik behalten. */
export function pvAusTreffern(treffer: Treffer[]): PvAnlage[] {
  return treffer.flatMap((t) => {
    const p = t.properties ?? t.attributes ?? {}
    const art = String(p.sub_category_de ?? p.sub_category_en ?? '')
    if (!/photovolta/i.test(art)) return []
    const g = t.geometry
    const e = g?.coordinates?.[0] ?? g?.x ?? null
    const n = g?.coordinates?.[1] ?? g?.y ?? null
    return [{ egid: p.egid != null ? String(p.egid) : null, kw: leistungKw(p.total_power), e, n }]
  })
}

/**
 * Summe der PV-Leistung (kW) an einem Gebäude: gleiche EGID oder innerhalb des Radius. Der Radius wächst mit der
 * Grundfläche, weil bei grossen Hallen die Adresse weit von der Mitte liegen kann.
 */
export function pvAmGebaeude(
  anlagen: PvAnlage[],
  g: { egid?: string | number | null; e: number; n: number; grundflaeche_m2?: number | null },
): number {
  const radius = Math.max(40, Math.sqrt(g.grundflaeche_m2 ?? 0) * 0.9)
  const egid = g.egid != null ? String(g.egid) : null
  const summe = anlagen
    .filter(
      (a) =>
        (egid !== null && a.egid === egid) ||
        (a.e !== null && a.n !== null && Math.hypot(a.e - g.e, a.n - g.n) <= radius),
    )
    .reduce((s, a) => s + a.kw, 0)
  return Math.round(summe * 10) / 10
}

/** Alle PV-Anlagen in einem Rechteck (LV95), seitenweise, höchstens 20 Seiten. */
export async function pvImRechteck(
  r: { e_min: number; n_min: number; e_max: number; n_max: number },
  geo = new GeoAdmin(),
): Promise<PvAnlage[]> {
  const flaeche = `${r.e_min},${r.n_min},${r.e_max},${r.n_max}`
  const alle: PvAnlage[] = []
  for (let seite = 0; seite < 20; seite++) {
    const d = await geo.json<{ results?: Treffer[] }>('/rest/services/api/MapServer/identify', {
      geometry: flaeche,
      geometryType: 'esriGeometryEnvelope',
      sr: '2056',
      layers: `all:${LAYER}`,
      tolerance: '0',
      mapExtent: flaeche,
      imageDisplay: '1000,1000,96',
      returnGeometry: 'true',
      geometryFormat: 'geojson',
      limit: String(SEITE),
      offset: String(seite * SEITE),
      lang: 'de',
    })
    const teil = d.results ?? []
    alle.push(...pvAusTreffern(teil))
    if (teil.length < SEITE) break
  }
  return alle
}

/** PV-Leistung an einem Gebäude (für Grossprojekte von Hand oder von vor dieser Prüfung). */
export async function pvBeiGebaeude(
  g: { egid?: string | null; e: number; n: number; grundflaeche_m2?: number | null },
  geo = new GeoAdmin(),
): Promise<number> {
  const rand = Math.max(80, Math.sqrt(g.grundflaeche_m2 ?? 0))
  const anlagen = await pvImRechteck(
    { e_min: g.e - rand, n_min: g.n - rand, e_max: g.e + rand, n_max: g.n + rand },
    geo,
  )
  return pvAmGebaeude(anlagen, g)
}

/** Zeitplan: PV-Bestand für Grossprojekte nachtragen, die noch nie geprüft wurden; bei Ausfall aufhören. */
export async function grossprojektePvNachtragen(limit = 20, geo = new GeoAdmin()): Promise<string> {
  const offen = await dienst.rpc<
    { id: string; lage_e: number; lage_n: number; egid: string | null; grundflaeche_m2: number | null }[]
  >('grossprojekt_pv_offen', { p_limit: limit })
  let n = 0
  for (const g of offen) {
    try {
      const kw = await pvBeiGebaeude(
        { egid: g.egid, e: Number(g.lage_e), n: Number(g.lage_n), grundflaeche_m2: g.grundflaeche_m2 },
        geo,
      )
      await dienst.rpc('grossprojekt_pv_setzen', { p_id: g.id, p: { pv_bestand_kw: kw } })
      n++
    } catch (f) {
      if (istDienstAusfall(f)) return `${n} PV geprüft, geo.admin nicht erreichbar`
      throw f
    }
  }
  return `${n} PV geprüft`
}
