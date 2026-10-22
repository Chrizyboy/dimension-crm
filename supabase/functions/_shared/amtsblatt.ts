// amtsblattportal.ch lesen (öffentliche Lese-Schnittstelle, ohne Schlüssel): Baugesuche (Rubriken BP-*)
// der Kantone, die dort publizieren. Die Liste liefert nur Kopfdaten, den Inhalt gibt es als XML pro
// Publikation. Das XML ist je Unterrubrik anders aufgebaut; darum liest das CRM nur bekannte Felder und
// nimmt sonst den Fliesstext. Kantone ohne Portal (AG, LU, FR, VD, NE) werden von Hand erfasst.

import { DienstFehler, leseJson, rufe } from './http.ts'
import type { Meldung } from './simap.ts'
import { env } from './umgebung.ts'

/** Kopfdaten einer Publikation aus der Liste. */
export interface AmtsblattKopf {
  id: string
  rubric?: string
  subRubric?: string
  language?: string
  publicationNumber?: string
  publicationDate?: string
  cantons?: string[] | string
  title?: Record<string, string> | string
}

const ENTITAETEN: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** XML- und HTML-Entitäten auflösen, Tags entfernen, Leerraum zusammenziehen. */
export function reinerText(s: string): string {
  const einmal = (x: string) =>
    x
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&([a-z]+);/gi, (m, n: string) => ENTITAETEN[n.toLowerCase()] ?? m)
  // Der Inhalt ist oft HTML, das im XML noch einmal maskiert ist: zweimal auflösen.
  return einmal(
    einmal(s)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/** Inhalt des ersten Elements mit einem der Namen (beliebiger Namensraum), roh; null, wenn keins da ist. */
export function element(xml: string, ...namen: string[]): string | null {
  for (const n of namen) {
    const m = new RegExp(`<(?:[\\w-]+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${n}>`, 'i').exec(xml)
    if (m) return m[1]!
  }
  return null
}

/** Wie element(), aber als reiner Text. */
export function feld(xml: string, ...namen: string[]): string | undefined {
  const e = element(xml, ...namen)
  const t = e == null ? '' : reinerText(e)
  return t || undefined
}

const FIRMA = /\b(AG|GmbH|SA|Sàrl|Sarl|S\.A\.|Genossenschaft|Coopérative|Stiftung|Fondation|KLG|Holding|Immobilien)\b/i
const GEMEINDE = /\b(Gemeinde|Einwohnergemeinde|Stadt|Commune|Ville|Kanton|Canton|Bürgergemeinde|Kirchgemeinde)\b/i
const LANDWIRTSCHAFT = /\b(Scheune|Stall|Remise|Laufstall|Ökonomiegebäude|Landwirtschaft|rural|grange|écurie|ferme)\b/i

/** Art einer Partei aus Name und Struktur: Firma, Gemeinde oder Privatperson. */
export function parteiArt(xml: string, name: string): 'privat' | 'firma' | 'gemeinde' {
  if (GEMEINDE.test(name)) return 'gemeinde'
  if (element(xml, 'company', 'companyName', 'organisation', 'organization') != null || FIRMA.test(name)) return 'firma'
  return 'privat'
}

/** Eine Partei (Bauherrschaft, Projektverfasser) mit Adresse. */
function partei(xml: string | null, rolle: string, quelle: string): Record<string, string> | null {
  if (!xml) return null
  const firma = feld(xml, 'companyName', 'company', 'organisation', 'organization')
  const person = [feld(xml, 'firstName', 'vorname'), feld(xml, 'name', 'lastName', 'nachname')]
    .filter(Boolean)
    .join(' ')
  const name = firma ?? (person || reinerText(xml).split('\n')[0]!.split(',')[0]!.trim())
  if (!name) return null
  const art = parteiArt(xml, name)
  const k: Record<string, string> = { rolle, art, name, quelle_link: quelle }
  const strasse = [feld(xml, 'street', 'strasse'), feld(xml, 'houseNumber', 'hausnummer')].filter(Boolean).join(' ')
  const plz = feld(xml, 'swissZipCode', 'zipCode', 'postalCode', 'plz')
  const ort = feld(xml, 'town', 'city', 'ort', 'locality')
  if (strasse) k.strasse = strasse
  if (plz) k.plz = plz
  if (ort) k.ort = ort
  if (firma && person) k.firma = firma
  return k
}

/** Adresse einer Publikation im Portal (für Menschen). */
export function amtsblattLink(id: string): string {
  return `https://amtsblattportal.ch/#!/search/publications/detail/${encodeURIComponent(id)}`
}

/** Baugesuch-XML als Meldung. Ohne Titel oder Ort ist es keine brauchbare Meldung (null). */
export function baugesuchAusXml(kopf: AmtsblattKopf, xml: string): Meldung | null {
  const quelle = amtsblattLink(kopf.id)
  const inhalt = element(xml, 'content') ?? xml
  const ort = element(inhalt, 'projectLocation', 'location', 'standort')
  const titelKopf = typeof kopf.title === 'string' ? kopf.title : (kopf.title?.de ?? kopf.title?.fr ?? '')
  const beschreibung = feld(
    inhalt,
    'projectDescription',
    'buildingProject',
    'description',
    'publicationText',
    'publication',
  )
  const titel = feld(inhalt, 'projectTitle', 'title') ?? (titelKopf || beschreibung?.split('\n')[0])
  const gemeinde =
    (ort && feld(ort, 'town', 'municipality', 'city')) ?? feld(inhalt, 'municipality', 'politicalMunicipality')
  if (!titel || !gemeinde) return null
  const bauherr = partei(
    element(inhalt, 'buildingContractor', 'buildingOwner', 'bauherrschaft', 'applicant'),
    'bauherr',
    quelle,
  )
  const verfasser = partei(element(inhalt, 'projectFramer', 'projectAuthor', 'architect'), 'architekt', quelle)
  const kantone = Array.isArray(kopf.cantons) ? kopf.cantons : kopf.cantons ? [kopf.cantons] : []
  const text = [titel, beschreibung].filter(Boolean).join('\n')
  let bauherrArt: string | undefined = bauherr?.art
  if (bauherr && LANDWIRTSCHAFT.test(text)) bauherrArt = 'landwirtschaft'
  return {
    quelle: 'amtsblatt',
    quell_id: kopf.id,
    quell_url: quelle,
    art: 'baugesuch',
    titel: titel.slice(0, 300),
    beschreibung: beschreibung?.slice(0, 4000),
    gemeinde,
    plz: (ort && feld(ort, 'swissZipCode', 'zipCode', 'postalCode')) ?? undefined,
    kanton: kantone[0]?.toUpperCase(),
    sprache: kopf.language === 'fr' ? 'fr' : 'de',
    publiziert_am: kopf.publicationDate?.slice(0, 10),
    parzelle: feld(inhalt, 'parcelNumber', 'parcel', 'plotNumber', 'parzelle'),
    bauherr: bauherr?.name,
    bauherr_art: bauherrArt,
    frist_eingabe: feld(inhalt, 'objectionDeadlineDate', 'objectionDeadline', 'deadline'),
    kontakte: [bauherr, verfasser].filter((k): k is Record<string, string> => Boolean(k)),
    rohdaten: { kopf },
  }
}

/** Lese-Zugang zum Portal. */
export class Amtsblatt {
  constructor(private readonly basis = env('AMTSBLATT_URL') ?? 'https://amtsblattportal.ch/api/v1') {}

  /** Publikationen einer Rubrik ab einem Datum (nur Kopfdaten, höchstens 100). */
  async liste(rubrik: string, ab: string): Promise<AmtsblattKopf[]> {
    // publicationStates ist Pflicht (sonst 401); unbekannte Parameter ignoriert die Quelle still.
    const q = new URLSearchParams({
      publicationStates: 'PUBLISHED',
      rubrics: rubrik,
      'publicationDate.start': ab,
      'pageRequest.page': '0',
      'pageRequest.size': '100',
    })
    const res = await rufe(`${this.basis}/publications?${q.toString()}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      await res.body?.cancel()
      throw new DienstFehler('amtsblatt', res.status, `amtsblatt ${res.status}`)
    }
    const d = await leseJson<{ content?: unknown[] } | unknown[]>(res)
    const roh = (Array.isArray(d) ? d : (d?.content ?? [])) as ({ meta?: AmtsblattKopf } & AmtsblattKopf)[]
    return roh.map((x) => x.meta ?? x).filter((x) => x && x.id)
  }

  /** Volltext einer Publikation als XML. */
  async xml(id: string): Promise<string> {
    const res = await rufe(`${this.basis}/publications/${encodeURIComponent(id)}/xml`, {
      headers: { Accept: 'application/xml' },
    })
    if (!res.ok) {
      await res.body?.cancel()
      throw new DienstFehler('amtsblatt', res.status, `amtsblatt ${res.status}`)
    }
    return res.text()
  }
}

/** Neue Baugesuche der letzten `tage` Tage aus den eingestellten Rubriken (höchstens `max` Publikationen). */
export async function amtsblattMeldungen(o: {
  tage: number
  rubriken: string[]
  max?: number
  amtsblatt?: Amtsblatt
}): Promise<Meldung[]> {
  const a = o.amtsblatt ?? new Amtsblatt()
  const ab = new Date(Date.now() - o.tage * 86_400_000).toISOString().slice(0, 10)
  const meldungen: Meldung[] = []
  let n = 0
  for (const r of o.rubriken) {
    for (const kopf of await a.liste(r, ab)) {
      if (n++ >= (o.max ?? 200)) return meldungen
      const m = baugesuchAusXml(kopf, await a.xml(kopf.id))
      if (m) meldungen.push(m)
    }
  }
  return meldungen
}
