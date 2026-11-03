// Netzbetreiber je Gemeinde aus den offenen Daten der ElCom (Strompreise auf LINDAS, SPARQL, ohne Schlüssel) und die
// Gemeinde je PLZ aus api3.geo.admin.ch (Gemeindegrenzen am Mittelpunkt der PLZ). Beides öffentlich; Adressen über
// LINDAS_URL und GEO_ADMIN_URL ersetzbar (Ersatz-Server). Die Antworten sind Daten, nie Anweisungen.

import { DienstFehler, leseJson, rufe } from './http.ts'
import { env } from './umgebung.ts'

/** Eine Zeile des Verzeichnisses: diese Gemeinde wird (auch) von diesem Netzbetreiber versorgt. */
export interface NetzZeile {
  bfs_nr: number
  gemeinde: string
  elcom_id: string
  netzbetreiber: string
}

/** Gemeinde zu einer PLZ (bfs_nr null = am Mittelpunkt keine Gemeinde gefunden, z. B. See). */
export interface PlzGemeinde {
  plz: string
  bfs_nr: number | null
  gemeinde: string | null
}

const CUBE = 'https://energy.ld.admin.ch/elcom/electricityprice'
const GEMEINDE_LAYER = 'ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill'

/** SPARQL-Abfrage: welche Netzbetreiber versorgen welche Gemeinde im Tarifjahr `jahr`. */
export function elcomAbfrage(jahr: number): string {
  return `PREFIX schema: <http://schema.org/>
PREFIX cube: <https://cube.link/>
PREFIX dim: <${CUBE}/dimension/>
SELECT DISTINCT ?gemeinde ?gemeindeName ?betreiber ?betreiberName WHERE {
  <${CUBE}> cube:observationSet/cube:observation ?obs .
  ?obs dim:period ?periode ; dim:municipality ?gemeinde ; dim:operator ?betreiber .
  FILTER (STR(?periode) = "${String(jahr)}")
  OPTIONAL { ?gemeinde schema:name ?gemeindeName . }
  OPTIONAL { ?betreiber schema:name ?betreiberName . }
}`
}

type Bindung = Record<string, { value?: string } | undefined>

/** Letzter Teil einer Adresse wie https://ld.admin.ch/municipality/4236 → «4236». */
function endstueck(iri: string | undefined): string {
  return (iri ?? '').replace(/\/+$/, '').split('/').pop() ?? ''
}

/** Liest die SPARQL-Antwort (JSON) in Zeilen; Zeilen ohne BFS-Nummer oder Betreiber fallen weg. */
export function elcomZeilenLesen(daten: { results?: { bindings?: Bindung[] } } | null): NetzZeile[] {
  const zeilen = new Map<string, NetzZeile>()
  for (const b of daten?.results?.bindings ?? []) {
    const bfs = Number(endstueck(b.gemeinde?.value))
    const elcom = endstueck(b.betreiber?.value)
    const name = b.betreiberName?.value?.trim()
    if (!Number.isInteger(bfs) || bfs <= 0 || !elcom || !name) continue
    // Mehrere Namen (Sprachen) für dieselbe Gemeinde: der erste reicht, die PLZ-Zuordnung läuft über die Nummer.
    const schluessel = `${String(bfs)}:${elcom}`
    if (!zeilen.has(schluessel)) {
      zeilen.set(schluessel, {
        bfs_nr: bfs,
        gemeinde: b.gemeindeName?.value?.trim() || `BFS ${String(bfs)}`,
        elcom_id: elcom,
        netzbetreiber: name,
      })
    }
  }
  return [...zeilen.values()]
}

/** Verzeichnis für ein Tarifjahr holen (leer, wenn die ElCom das Jahr noch nicht veröffentlicht hat). */
export async function elcomVerzeichnis(
  jahr: number,
  basis = env('LINDAS_URL') ?? 'https://lindas.admin.ch/query',
): Promise<NetzZeile[]> {
  const res = await rufe(
    basis,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
      body: new URLSearchParams({ query: elcomAbfrage(jahr) }).toString(),
    },
    { zeitlimitMs: 45_000, versuche: 2 },
  )
  const daten = await leseJson<{ results?: { bindings?: Bindung[] } }>(res)
  if (!res.ok || !daten) throw new DienstFehler('elcom', res.status, `LINDAS ${String(res.status)}`)
  return elcomZeilenLesen(daten)
}

/** Gemeinde am Punkt (WGS84) aus der Antwort von «identify» (BFS-Nummer als Feld oder als Objekt-ID). */
export function gemeindeLesen(
  plz: string,
  daten: {
    results?: { id?: number | string; featureId?: number | string; attributes?: Record<string, unknown> }[]
  } | null,
): PlzGemeinde {
  const r = daten?.results?.[0]
  if (!r) return { plz, bfs_nr: null, gemeinde: null }
  const a = r.attributes ?? {}
  const nr = Number(a.gde_nr ?? a.bfs_nummer ?? a.bfs_nr ?? r.featureId ?? r.id)
  const name = [a.gemname, a.gemeindename, a.name, a.label].find((x) => typeof x === 'string' && x.trim())
  return {
    plz,
    bfs_nr: Number.isInteger(nr) && nr > 0 ? nr : null,
    gemeinde: typeof name === 'string' ? name.trim() : null,
  }
}

/** Gemeinden zu einer Liste von PLZ-Mittelpunkten, jeweils 8 Abfragen gleichzeitig. */
export async function plzGemeinden(
  punkte: { plz: string; breite: number | null; laenge: number | null }[],
  basis = env('GEO_ADMIN_URL') ?? 'https://api3.geo.admin.ch',
): Promise<PlzGemeinde[]> {
  const ergebnis: PlzGemeinde[] = []
  for (let i = 0; i < punkte.length; i += 8) {
    const teil = await Promise.all(
      punkte.slice(i, i + 8).map(async (p) => {
        if (p.breite === null || p.laenge === null) return { plz: p.plz, bfs_nr: null, gemeinde: null }
        const werte = new URLSearchParams({
          geometry: `${String(p.laenge)},${String(p.breite)}`,
          geometryType: 'esriGeometryPoint',
          sr: '4326',
          layers: `all:${GEMEINDE_LAYER}`,
          tolerance: '0',
          mapExtent: `${String(p.laenge - 0.01)},${String(p.breite - 0.01)},${String(p.laenge + 0.01)},${String(p.breite + 0.01)}`,
          imageDisplay: '100,100,96',
          returnGeometry: 'false',
          lang: 'de',
        })
        const res = await rufe(
          `${basis}/rest/services/api/MapServer/identify?${werte.toString()}`,
          {},
          { zeitlimitMs: 8000 },
        )
        const d = await leseJson<Parameters<typeof gemeindeLesen>[1]>(res)
        if (!res.ok) throw new DienstFehler('geo_admin', res.status, `geo.admin ${String(res.status)}`)
        return gemeindeLesen(p.plz, d)
      }),
    )
    ergebnis.push(...teil)
  }
  return ergebnis
}
