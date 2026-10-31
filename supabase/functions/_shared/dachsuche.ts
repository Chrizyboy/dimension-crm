// Dachsuche für den Grossprojekt-Monitor (Phase 8c): Der Zeitplan geht das Gebiet um die Standorte Kachel für Kachel
// durch (die nächsten zuerst, siehe grossprojekt_suche_naechste). Pro Kachel holt er alle Gebäude aus dem
// Gebäuderegister, behält die grossen mit viel Stromverbrauch (Gebäudeklasse und Grundfläche aus den Einstellungen)
// und fragt für diese das Dach bei sonnendach.ch ab. Ob ein Gebäude in den Vorrat kommt (Punkte, schon bekannt), entscheidet
// die Datenbank in grossprojekt_in_vorrat; in die Liste kommen pro Woche nur die besten. Die Antworten des Bundes sind Daten (Regel 7).

import { dienst } from './datenbank.ts'
import { dachZusammenfassen, GeoAdmin, gwrFelder, istDienstAusfall, type GwrGebaeude } from './gebaeude.ts'

/** Eine Kachel in LV95 (Meter). */
export interface Kachel {
  kachel: string
  e_min: number
  n_min: number
  e_max: number
  n_max: number
}

/** Einstellungen der Suche (einstellungen.grossprojekte.suche). */
export interface SucheRegeln {
  klassen: number[]
  min_grundflaeche_m2: number
  min_dach_m2: number
}

/** Ein Gebäude aus dem Gebäuderegister mit Lage und Adresse. Strasse/PLZ kommen je nach Abfrage als Liste. */
export interface GwrEintrag extends GwrGebaeude {
  gkode?: number | null
  gkodn?: number | null
  garea?: number | null
  strname_deinr?: string | null
  strname?: string[] | string | null
  deinr?: string[] | string | null
  dplz4?: number[] | number | string | null
  ggdename?: string | null
  lparz?: string | null
}

const GWR = 'ch.bfs.gebaeude_wohnungs_register'
const SEITE = 200
/** 12'500 wie überall im CRM (toLocaleString liefert je nach Laufzeit ’ oder gar nichts). */
const tausender = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
const erstes = <T>(w: T[] | T | null | undefined): T | undefined => (Array.isArray(w) ? w[0] : (w ?? undefined))

/** Gross genug und eine Gebäudeklasse mit viel Verbrauch? */
export function istKandidat(g: GwrEintrag, r: SucheRegeln): boolean {
  return (
    g.gklas != null &&
    r.klassen.includes(g.gklas) &&
    (g.garea ?? 0) >= r.min_grundflaeche_m2 &&
    g.gkode != null &&
    g.gkodn != null
  )
}

/** Felder für grossprojekt_aus_suche aus Gebäuderegister und Dach. */
export function sucheFelder(g: GwrEintrag, dach: ReturnType<typeof dachZusammenfassen>): Record<string, unknown> {
  const strasse =
    g.strname_deinr?.trim() || [erstes(g.strname), erstes(g.deinr)].filter(Boolean).join(' ').trim() || undefined
  const plz = erstes(g.dplz4)
  const e = Math.round(g.gkode ?? 0)
  const n = Math.round(g.gkodn ?? 0)
  return {
    ...gwrFelder(g),
    ...dach,
    strasse,
    plz: plz != null ? String(plz) : undefined,
    gemeinde: g.ggdename ?? undefined,
    parzelle: g.lparz ?? undefined,
    lage_e: e,
    lage_n: n,
    quell_url: `https://map.geo.admin.ch/#/map?lang=de&center=${e},${n}&z=12&layers=ch.bfe.solarenergie-eignung-daecher`,
  }
}

/** Alle Gebäude einer Kachel aus dem Gebäuderegister (seitenweise, höchstens 20 Seiten). */
export async function gebaeudeInKachel(k: Kachel, geo = new GeoAdmin()): Promise<GwrEintrag[]> {
  const alle: GwrEintrag[] = []
  const flaeche = `${k.e_min},${k.n_min},${k.e_max},${k.n_max}`
  for (let seite = 0; seite < 20; seite++) {
    const d = await geo.json<{ results?: { attributes?: GwrEintrag }[] }>('/rest/services/api/MapServer/identify', {
      geometry: flaeche,
      geometryType: 'esriGeometryEnvelope',
      sr: '2056',
      layers: `all:${GWR}`,
      tolerance: '0',
      mapExtent: flaeche,
      imageDisplay: '1000,1000,96',
      returnGeometry: 'false',
      limit: String(SEITE),
      offset: String(seite * SEITE),
      lang: 'de',
    })
    const teil = (d.results ?? []).map((r) => r.attributes ?? {})
    alle.push(...teil)
    if (teil.length < SEITE) break
  }
  return alle
}

/** Eine Kachel durchsuchen und die Treffer an die Datenbank geben. */
export async function kachelDurchsuchen(k: Kachel, r: SucheRegeln, geo = new GeoAdmin()) {
  const gebaeude = await gebaeudeInKachel(k, geo)
  const kandidaten = gebaeude.filter((g) => istKandidat(g, r))
  let treffer = 0
  for (const g of kandidaten) {
    const dach = dachZusammenfassen(await geo.dach(g.gkode ?? 0, g.gkodn ?? 0))
    if ((dach.dachflaeche_m2 ?? 0) < r.min_dach_m2) continue
    const meldung = `Dachsuche: Dach ${tausender(dach.dachflaeche_m2 ?? 0)} m² geeignet, Gebäuderegister EGID ${g.egid ?? '–'}`
    // Erst in den Vorrat: der Zeitplan gibt pro Woche nur die besten frei (grossprojekt_vorrat_freigeben).
    const neu = await dienst.rpc<boolean>('grossprojekt_in_vorrat', { p: sucheFelder(g, dach), p_meldung: meldung })
    if (neu) treffer++
  }
  await dienst.rpc('grossprojekt_suche_kachel_fertig', {
    p_kachel: k.kachel,
    p_gebaeude: gebaeude.length,
    p_kandidaten: kandidaten.length,
    p_treffer: treffer,
  })
  return { gebaeude: gebaeude.length, kandidaten: kandidaten.length, treffer }
}

/** Zeitplan: die nächsten Kacheln durchsuchen; bei Ausfall des Bundesdienstes aufhören (nächste Stunde weiter). */
export async function dachsuche(geo = new GeoAdmin()): Promise<string> {
  const kacheln = await dienst.rpc<Kachel[]>('grossprojekt_suche_naechste', {})
  if (kacheln.length === 0) return 'Dachsuche aus oder alles durchsucht'
  const [e] = await dienst.lies<{ wert: { suche?: Partial<SucheRegeln> } }[]>(
    'einstellungen?schluessel=eq.grossprojekte&select=wert',
  )
  const s = e?.wert.suche ?? {}
  const regeln: SucheRegeln = {
    klassen: s.klassen ?? [],
    min_grundflaeche_m2: s.min_grundflaeche_m2 ?? 800,
    min_dach_m2: s.min_dach_m2 ?? 500,
  }
  let n = 0
  let treffer = 0
  for (const k of kacheln) {
    try {
      treffer += (await kachelDurchsuchen(k, regeln, geo)).treffer
      n++
    } catch (f) {
      if (istDienstAusfall(f)) return `Dachsuche: ${n} Gebiete, ${treffer} neu, geo.admin nicht erreichbar`
      throw f
    }
  }
  return `Dachsuche: ${n} Gebiete, ${treffer} in den Vorrat`
}
