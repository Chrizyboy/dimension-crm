// simap.ch lesen (öffentliche Lese-Schnittstelle, ohne Schlüssel). Sucht neue Publikationen nach
// CPV-Codes und Stichworten in den Kantonen des Einzugsgebiets und macht daraus Meldungen für
// «ausschreibung_einlesen». Eigenheiten der Quelle: «lang» ist Pflicht, die erste Antwort setzt ein
// Sitzungs-Cookie, Zuschläge heissen award_tender, direct_award … Externe Texte sind nur Daten (Regel 7).

import { DienstFehler, leseJson, rufe } from './http.ts'
import { env } from './umgebung.ts'

/** Mehrsprachiger Text, wie simap ihn liefert. */
export type Uebersetzung = Partial<Record<'de' | 'fr' | 'it' | 'en', string | null>> | null | undefined

/** Ein Treffer der Projektsuche (nur die Felder, die das CRM braucht). */
export interface SimapProjekt {
  id: string
  title?: Uebersetzung
  projectNumber?: string
  projectSubType?: string
  processType?: string
  publicationId?: string
  publicationDate?: string
  pubType?: string
  corrected?: boolean
  procOfficeName?: Uebersetzung
  orderAddress?: { city?: Uebersetzung | string; canton?: string; postalCode?: string } | null
  lots?: { lotTitle?: Uebersetzung }[] | null
}

/** Die Details einer Publikation (Fristen, Beschreibung, Gewinner). */
export interface SimapDetails {
  base?: { title?: Uebersetzung; cpvCode?: { code?: string } | null } | null
  procurement?: { orderDescription?: Uebersetzung; cpvCode?: { code?: string } | null } | null
  dates?: {
    offerDeadline?: string | null
    qnas?: { date?: string | null }[] | null
    siteVisit?: { dateTime?: string | null } | null
  } | null
  decision?: { vendors?: { vendorName?: string | null; rank?: number | null }[] | null } | null
  publishers?: { name?: string | null }[] | null
}

/** Meldung im Format von «ausschreibung_einlesen». */
export interface Meldung {
  quelle: string
  quell_id: string
  quell_url: string
  art: string
  titel: string
  beschreibung?: string
  gemeinde?: string
  plz?: string
  kanton?: string
  sprache?: 'de' | 'fr'
  vergabestelle?: string
  publiziert_am?: string
  frist_eingabe?: string
  frist_fragen?: string
  frist_begehung?: string
  korrigiert?: boolean
  cpv?: string[]
  bauherr?: string
  bauherr_art?: string
  parzelle?: string
  kontakte?: Record<string, string>[]
  rohdaten?: unknown
}

const FRANZOESISCH = new Set(['FR', 'VD', 'NE', 'GE', 'JU', 'VS'])

/** Text in der gewünschten Sprache, sonst in der nächstbesten. */
export function text(t: Uebersetzung | string, sprache: 'de' | 'fr' = 'de'): string {
  if (!t) return ''
  if (typeof t === 'string') return t
  return (t[sprache] ?? t.de ?? t.fr ?? t.it ?? t.en ?? '').trim()
}

/** Art der Meldung aus dem Publikationstyp; null = für den Monitor ohne Bedeutung. */
export function artAusPubType(pubType: string | undefined, processType: string | undefined): string | null {
  const p = pubType ?? ''
  if (p.startsWith('award') || p === 'direct_award') return 'zuschlag'
  if (p === 'advance_notice' || p === 'request_for_information') return 'vorankuendigung'
  // Auf Einladung oder freihändig kann sich niemand bewerben: nur offene und selektive Verfahren.
  if ((p === 'tender' || p === 'correction') && processType !== 'invitation' && processType !== 'direct') {
    return 'ausschreibung'
  }
  return null
}

/** Ein Projekt (und, falls geholt, seine Details) als Meldung. */
export function alsMeldung(pr: SimapProjekt, d: SimapDetails | null): Meldung | null {
  const art = artAusPubType(pr.pubType, pr.processType)
  if (!art) return null
  const kanton = pr.orderAddress?.canton?.toUpperCase()
  const sprache: 'de' | 'fr' = kanton && FRANZOESISCH.has(kanton) ? 'fr' : 'de'
  const lose = (pr.lots ?? []).map((l) => text(l.lotTitle, sprache)).filter(Boolean)
  const cpv = [d?.base?.cpvCode?.code, d?.procurement?.cpvCode?.code].filter((c): c is string => Boolean(c))
  const fragen = (d?.dates?.qnas ?? [])
    .map((q) => q.date)
    .filter((x): x is string => Boolean(x))
    .sort()[0]
  const gewinner = (d?.decision?.vendors ?? [])
    .filter((v) => v.vendorName && (v.rank == null || v.rank === 1))
    .map((v) => ({ rolle: 'gewinner', art: 'firma', name: v.vendorName!.trim(), quelle_link: link(pr.id) }))
  return {
    quelle: 'simap',
    quell_id: pr.id,
    quell_url: link(pr.id),
    art,
    titel: text(pr.title, sprache) || text(d?.base?.title, sprache) || (pr.projectNumber ?? pr.id),
    beschreibung: [text(d?.procurement?.orderDescription, sprache), lose.length ? `Lose: ${lose.join('; ')}` : '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 4000),
    gemeinde: text(pr.orderAddress?.city, sprache) || undefined,
    plz: pr.orderAddress?.postalCode ?? undefined,
    kanton,
    sprache,
    vergabestelle: text(pr.procOfficeName, sprache) || d?.publishers?.[0]?.name || undefined,
    publiziert_am: pr.publicationDate?.slice(0, 10),
    frist_eingabe: d?.dates?.offerDeadline ?? undefined,
    frist_fragen: fragen?.slice(0, 10),
    frist_begehung: d?.dates?.siteVisit?.dateTime ?? undefined,
    korrigiert: Boolean(pr.corrected) || pr.pubType === 'correction',
    cpv,
    kontakte: gewinner,
    rohdaten: { projekt: pr, details: d },
  }
}

/** Adresse der Projektseite auf simap.ch (für Menschen). */
export function link(projektId: string): string {
  return `https://www.simap.ch/de/project-detail/${encodeURIComponent(projektId)}`
}

/** Lese-Zugang mit Sitzungs-Cookie (die erste Antwort setzt es). */
export class Simap {
  private keks = ''
  constructor(private readonly basis = env('SIMAP_URL') ?? 'https://www.simap.ch/api') {}

  private async hole<T>(pfad: string, suche?: URLSearchParams): Promise<T> {
    const url = `${this.basis}${pfad}${suche ? `?${suche.toString()}` : ''}`
    const res = await rufe(url, {
      headers: { Accept: 'application/json', ...(this.keks ? { Cookie: this.keks } : {}) },
    })
    const gesetzt = res.headers.get('set-cookie')
    if (gesetzt) this.keks = gesetzt.split(';')[0]!
    if (!res.ok) {
      await res.body?.cancel()
      throw new DienstFehler('simap', res.status, `simap ${res.status}`)
    }
    return (await leseJson<T>(res)) as T
  }

  /** Projektsuche ab einem Datum; blättert höchstens `seiten` Seiten. */
  async suche(o: {
    ab: string
    kantone: string[]
    cpv?: string[]
    text?: string
    seiten?: number
  }): Promise<SimapProjekt[]> {
    const alle: SimapProjekt[] = []
    let letzter: string | undefined
    for (let i = 0; i < (o.seiten ?? 5); i++) {
      const q = new URLSearchParams({ lang: 'de', newestPublicationFrom: o.ab })
      for (const k of o.kantone) q.append('orderAddressCantons', k)
      for (const c of o.cpv ?? []) q.append('cpvCodes', c)
      if (o.text) q.set('search', o.text)
      if (letzter) q.set('lastItem', letzter)
      const r = await this.hole<{ projects?: SimapProjekt[]; pagination?: { lastItem?: string | null } }>(
        '/publications/v2/project/project-search',
        q,
      )
      alle.push(...(r?.projects ?? []))
      letzter = r?.pagination?.lastItem ?? undefined
      if (!letzter || !r?.projects?.length) break
    }
    return alle
  }

  /** Details einer Publikation. */
  details(projektId: string, publikationId: string): Promise<SimapDetails> {
    return this.hole<SimapDetails>(
      `/publications/v1/project/${encodeURIComponent(projektId)}/publication-details/${encodeURIComponent(publikationId)}`,
    )
  }
}

/**
 * Neue Meldungen der letzten `tage` Tage: Suche nach CPV-Codes und nach Stichworten, ohne Doppelte.
 * Details (Fristen, Gewinner) nur für höchstens `maxDetails` Treffer, damit ein Lauf kurz bleibt.
 */
export async function simapMeldungen(o: {
  tage: number
  kantone: string[]
  cpv: string[]
  stichworte: string[]
  maxDetails?: number
  simap?: Simap
}): Promise<Meldung[]> {
  const s = o.simap ?? new Simap()
  const ab = new Date(Date.now() - o.tage * 86_400_000).toISOString().slice(0, 10)
  const gesehen = new Map<string, SimapProjekt>()
  const listen = [await s.suche({ ab, kantone: o.kantone, cpv: o.cpv })]
  for (const w of o.stichworte) listen.push(await s.suche({ ab, kantone: o.kantone, text: w, seiten: 2 }))
  for (const p of listen.flat()) gesehen.set(`${p.id}|${p.publicationId ?? ''}`, p)
  const meldungen: Meldung[] = []
  let details = 0
  for (const p of gesehen.values()) {
    if (!artAusPubType(p.pubType, p.processType)) continue
    let d: SimapDetails | null = null
    if (p.publicationId && details < (o.maxDetails ?? 40)) {
      details++
      d = await s.details(p.id, p.publicationId).catch(() => null)
    }
    const m = alsMeldung(p, d)
    if (m) meldungen.push(m)
  }
  return meldungen
}
