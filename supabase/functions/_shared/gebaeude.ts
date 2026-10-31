// Gebäudedaten für den Grossprojekt-Monitor (Phase 8c) aus den offenen Diensten des Bundes (api3.geo.admin.ch,
// ohne Schlüssel): Adresse oder Parzelle → Koordinaten, sonnendach.ch → geeignete Dachfläche und Ertrag,
// Gebäuderegister (GWR) → Baujahr, Wohnungen, Heizung. Feldnamen laut Dokumentation der Dienste; die Antworten
// sind Daten (Regel 7). Gespeichert wird über «grossprojekt_anreichern», das von Hand Eingetragenes stehen lässt.

import { dienst } from './datenbank.ts'
import { DienstFehler, leseJson, rufe } from './http.ts'
import { env } from './umgebung.ts'

/** Was zum Suchen nötig ist. */
export interface GebaeudeSuche {
  id: string
  strasse?: string | null
  plz?: string | null
  gemeinde?: string | null
  parzelle?: string | null
}

/** Ergebnis im Format von «grossprojekt_anreichern». */
export interface Gebaeude {
  lage_e?: number
  lage_n?: number
  egid?: string
  baujahr?: number
  wohnungen?: number
  heizung?: string
  heizung_jahr?: number
  nutzung?: string
  dachflaeche_m2?: number
  dach_klasse?: number
  stromertrag_kwh?: number
}

/** Eine Dachfläche von sonnendach.ch. */
export interface Dachflaeche {
  building_id?: number | string
  flaeche?: number
  klasse?: number
  stromertrag?: number
}

/** Attribute eines Gebäudes im GWR (nur die gebrauchten). */
export interface GwrGebaeude {
  egid?: number | string
  gbauj?: number | null
  ganzwhg?: number | null
  gkat?: number | null
  gklas?: number | null
  genh1?: number | null
  gwaerdath1?: string | null
}

const SONNENDACH = 'ch.bfe.solarenergie-eignung-daecher'
const GWR = 'ch.bfs.gebaeude_wohnungs_register'

/** Ab dieser Klasse gilt eine Dachfläche als geeignet (3 gut, 4 sehr gut, 5 hervorragend). */
export const KLASSE_GEEIGNET = 3

/** Energieträger der Heizung (GWR «genh1») in die Werte des CRM. */
export function heizungAusGwr(code: number | null | undefined): string | undefined {
  if (code === null || code === undefined) return undefined
  if (code === 7530) return 'oel'
  if (code === 7520) return 'gas'
  if (code === 7560) return 'elektro'
  if (code >= 7540 && code <= 7543) return 'holz'
  if (code === 7501 || (code >= 7510 && code <= 7513)) return 'waermepumpe'
  if (code >= 7580 && code <= 7582) return 'fernwaerme'
  return 'unbekannt'
}

/** Nutzung aus Gebäudeklasse (GWR «gklas») oder -kategorie («gkat»); unbekannt bleibt leer. */
export function nutzungAusGwr(gklas: number | null | undefined, gkat: number | null | undefined, wohnungen = 0) {
  const klasse: Record<number, string> = {
    1110: 'efh',
    1122: 'mfh',
    1130: 'heim',
    1220: 'verwaltung',
    1230: 'gewerbe',
    1251: 'industrie',
    1252: 'gewerbe',
    1263: 'schule',
    1264: 'spital',
    1265: 'sport',
    1271: 'landwirtschaft',
  }
  if (gklas && klasse[gklas]) return klasse[gklas]
  if (gkat === 1020) return 'efh'
  if (gkat === 1030 || gkat === 1040) return wohnungen >= 3 ? 'mfh' : undefined
  return undefined
}

/** Geeignete Dachflächen eines Gebäudes zusammenzählen (Fläche, Ertrag, beste Klasse). */
export function dachZusammenfassen(
  flaechen: Dachflaeche[],
): Pick<Gebaeude, 'dachflaeche_m2' | 'dach_klasse' | 'stromertrag_kwh'> {
  const gut = flaechen.filter((f) => (f.klasse ?? 0) >= KLASSE_GEEIGNET)
  if (flaechen.length === 0) return {}
  return {
    dachflaeche_m2: Math.round(gut.reduce((s, f) => s + (f.flaeche ?? 0), 0)),
    dach_klasse: Math.max(...flaechen.map((f) => f.klasse ?? 0)) || undefined,
    stromertrag_kwh: Math.round(gut.reduce((s, f) => s + (f.stromertrag ?? 0), 0)),
  }
}

/** GWR-Attribute in Felder des CRM. */
export function gwrFelder(g: GwrGebaeude): Gebaeude {
  const wohnungen = g.ganzwhg ?? undefined
  const jahr = g.gwaerdath1 ? Number(String(g.gwaerdath1).slice(0, 4)) : NaN
  return {
    ...(g.egid !== undefined ? { egid: String(g.egid) } : {}),
    ...(g.gbauj ? { baujahr: g.gbauj } : {}),
    ...(wohnungen !== undefined ? { wohnungen } : {}),
    ...(heizungAusGwr(g.genh1) ? { heizung: heizungAusGwr(g.genh1) } : {}),
    ...(Number.isFinite(jahr) && jahr > 1900 ? { heizung_jahr: jahr } : {}),
    ...(nutzungAusGwr(g.gklas, g.gkat, wohnungen ?? 0)
      ? { nutzung: nutzungAusGwr(g.gklas, g.gkat, wohnungen ?? 0) }
      : {}),
  }
}

/** Zugriff auf api3.geo.admin.ch (Basis-Adresse über GEO_ADMIN_URL ersetzbar, für den Ersatz-Server). */
export class GeoAdmin {
  constructor(private readonly basis = env('GEO_ADMIN_URL') ?? 'https://api3.geo.admin.ch') {}

  /** Eine Abfrage an den Dienst; Fehlerantwort oder leere Antwort wird zum DienstFehler «geo_admin». */
  async json<T>(pfad: string, werte: Record<string, string>): Promise<T> {
    const res = await rufe(`${this.basis}${pfad}?${new URLSearchParams(werte).toString()}`, {}, { zeitlimitMs: 8000 })
    const d = await leseJson<T>(res)
    if (!res.ok || !d) throw new DienstFehler('geo_admin', res.status, `geo.admin ${res.status}`)
    return d
  }

  /** Koordinaten (LV95) zu Adresse oder, wenn es keine gibt, zu Gemeinde und Parzelle. */
  async lage(s: GebaeudeSuche): Promise<{ e: number; n: number } | null> {
    const versuche: [string, string][] = []
    if (s.strasse) versuche.push(['address', [s.strasse, s.plz, s.gemeinde].filter(Boolean).join(' ')])
    if (s.parzelle && s.gemeinde) versuche.push(['parcel', `${s.gemeinde} ${s.parzelle}`])
    for (const [origins, searchText] of versuche) {
      const d = await this.json<{ results?: { attrs?: { x?: number; y?: number } }[] }>(
        '/rest/services/api/SearchServer',
        { searchText, type: 'locations', origins, sr: '2056', limit: '1' },
      )
      const a = d.results?.[0]?.attrs
      // In LV95 ist Ost immer grösser als Nord (2'xxx'xxx gegen 1'xxx'xxx); die Felder x/y sind beim Bund vertauscht.
      if (a?.x && a.y) return { e: Math.max(a.x, a.y), n: Math.min(a.x, a.y) }
    }
    return null
  }

  private identify<T>(layer: string, e: number, n: number) {
    return this.json<{ results?: { attributes?: T }[] }>('/rest/services/api/MapServer/identify', {
      geometry: `${e},${n}`,
      geometryType: 'esriGeometryPoint',
      sr: '2056',
      layers: `all:${layer}`,
      tolerance: '5',
      mapExtent: `${e - 50},${n - 50},${e + 50},${n + 50}`,
      imageDisplay: '100,100,96',
      returnGeometry: 'false',
      lang: 'de',
    })
  }

  /** Alle Dachflächen des Gebäudes an diesem Punkt. */
  async dach(e: number, n: number): Promise<Dachflaeche[]> {
    const d = await this.identify<Dachflaeche>(SONNENDACH, e, n)
    const gebaeude = d.results?.find((r) => r.attributes?.building_id !== undefined)?.attributes?.building_id
    if (gebaeude === undefined) return []
    const alle = await this.json<{ results?: { attributes?: Dachflaeche }[] }>('/rest/services/api/MapServer/find', {
      layer: SONNENDACH,
      searchText: String(gebaeude),
      searchField: 'building_id',
      contains: 'false',
      returnGeometry: 'false',
    })
    return (alle.results ?? []).map((r) => r.attributes ?? {}).filter((f) => String(f.building_id) === String(gebaeude))
  }

  /** Das Gebäude im GWR an diesem Punkt (das erste Ergebnis). */
  async gwr(e: number, n: number): Promise<GwrGebaeude | null> {
    const d = await this.identify<GwrGebaeude>(GWR, e, n)
    return d.results?.[0]?.attributes ?? null
  }
}

/** Gebäudedaten zu einem Grossprojekt holen. Meldung in Klartext für den Verlauf. */
export async function gebaeudeSuchen(
  s: GebaeudeSuche,
  geo = new GeoAdmin(),
): Promise<{ daten: Gebaeude; meldung: string }> {
  const lage = await geo.lage(s)
  if (!lage) return { daten: {}, meldung: 'Adresse nicht gefunden' }
  const daten: Gebaeude = { lage_e: Math.round(lage.e), lage_n: Math.round(lage.n) }
  const teile: string[] = []
  const [dach, gwr] = await Promise.allSettled([geo.dach(lage.e, lage.n), geo.gwr(lage.e, lage.n)])
  if (dach.status === 'fulfilled' && dach.value.length > 0) {
    Object.assign(daten, dachZusammenfassen(dach.value))
    teile.push(`Dach ${daten.dachflaeche_m2 ?? 0} m² geeignet`)
  } else teile.push(dach.status === 'rejected' ? 'sonnendach.ch nicht erreichbar' : 'kein Dach bei sonnendach.ch')
  if (gwr.status === 'fulfilled' && gwr.value) {
    Object.assign(daten, gwrFelder(gwr.value))
    teile.push(`Gebäuderegister EGID ${daten.egid ?? '–'}`)
  } else teile.push(gwr.status === 'rejected' ? 'Gebäuderegister nicht erreichbar' : 'nicht im Gebäuderegister')
  return { daten, meldung: teile.join(', ') }
}

/** Ist der Fehler ein Ausfall des Bundesdienstes (nicht erreichbar, Zeitlimit, Fehlerantwort)? */
export function istDienstAusfall(f: unknown): boolean {
  return f instanceof DienstFehler && ['geo_admin', 'netzwerk', 'zeitlimit', 'zu_viele', 'dienst'].includes(f.code)
}

/**
 * Ein Grossprojekt anreichern und speichern. Ist der Dienst des Bundes nicht erreichbar, wird nichts gespeichert und
 * der Fehler weitergegeben: Das Grossprojekt bleibt offen und der Zeitplan versucht es in einer Stunde wieder.
 */
export async function grossprojektAnreichern(s: GebaeudeSuche, geo = new GeoAdmin()): Promise<string> {
  const ergebnis = await gebaeudeSuchen(s, geo)
  await dienst.rpc('grossprojekt_anreichern', { p_id: s.id, p: ergebnis.daten, p_meldung: ergebnis.meldung })
  return ergebnis.meldung
}

/** Zeitplan: offene Grossprojekte mit Adresse oder Parzelle anreichern (älteste zuerst); bei Ausfall aufhören. */
export async function grossprojekteAnreichern(limit = 20, geo = new GeoAdmin()): Promise<string> {
  const offen = await dienst.lies<GebaeudeSuche[]>(
    `grossprojekte?angereichert_am=is.null&geloescht_am=is.null&or=(strasse.not.is.null,parzelle.not.is.null)` +
      `&select=id,strasse,plz,gemeinde,parzelle&order=erstellt_am&limit=${limit}`,
  )
  let n = 0
  for (const s of offen) {
    try {
      await grossprojektAnreichern(s, geo)
      n++
    } catch (f) {
      // Dienst nicht erreichbar: die übrigen auch nicht versuchen, in einer Stunde wieder.
      if (istDienstAusfall(f)) return `${n} angereichert, geo.admin nicht erreichbar`
      throw f
    }
  }
  return `${n} angereichert`
}
