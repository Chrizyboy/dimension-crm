import { supabase } from '@/services/supabase'
import type { Database, Json } from '@/types/datenbank'
import type { Eingang, EingangStatus, EturnityMeldung, Offerte, OffertVersion, Wirtschaftlichkeit } from '../types'

type OffertZeile = Database['public']['Views']['offerten_liste']['Row']
type EingangZeile = Database['public']['Views']['offerten_eingang']['Row']

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

function standortVon(s: string | null): 'muri' | 'bulle' | null {
  return s === 'muri' || s === 'bulle' ? s : null
}

/** Versionen aus V233 (wert als Text in CHF) und neue (betrag_rappen) in eine Form bringen. */
export function versionenAus(roh: Json | null): OffertVersion[] {
  if (!Array.isArray(roh)) return []
  return roh.flatMap((x) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return []
    const r = x as Record<string, unknown>
    const zahl = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
    const datei = (r.dokument ?? r.file) as { pfad?: string; path?: string; name?: string; url?: string } | undefined
    return [
      {
        v: Number(r.v) || 1,
        am: typeof r.am === 'string' ? r.am : null,
        by: typeof r.by === 'string' ? r.by : null,
        text: typeof r.text === 'string' ? r.text : null,
        betragRappen: zahl(r.betrag_rappen) ?? (r.wert ? Math.round(Number(r.wert) * 100) : null),
        kwp: zahl(r.kwp),
        batterie: typeof r.batterie === 'string' && r.batterie ? r.batterie : null,
        dokument: datei
          ? {
              ...(datei.pfad ? { pfad: datei.pfad } : {}),
              ...(datei.name ? { name: datei.name } : {}),
              ...(datei.url ? { url: datei.url } : {}),
            }
          : null,
      },
    ]
  })
}

/** Zeile der Ansicht `offerten_liste` in die App-Form. */
export function offerteAusZeile(z: OffertZeile): Offerte {
  return {
    id: z.id ?? '',
    nummer: z.nummer ?? '',
    titel: z.titel,
    status: z.status ?? 'in_arbeit',
    stand: z.stand ?? 'offerte',
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    standort: standortVon(z.standort),
    standortId: z.standort_id,
    angebotAm: z.angebot_am,
    angebotAmFrueher: z.angebot_am_frueher ?? [],
    faelligAm: z.faellig_am,
    betragRappen: z.betrag_rappen,
    kwp: z.leistung_kwp,
    anzahlModule: z.anzahl_module,
    wechselrichter: z.wechselrichter,
    batterie: z.batterie,
    entscheid: z.entscheid,
    entscheidAm: z.entscheid_am,
    vertagtGrund: z.vertagt_grund,
    verlustgrund: z.verlustgrund,
    nachfassenAm: z.nachfassen_am,
    verantwortlichId: z.verantwortlich_id,
    verantwortlichName: z.verantwortlich_name,
    eturnityId: z.eturnity_id,
    versionen: versionenAus(z.versionen),
    wirtschaftlichkeit: (z.wirtschaftlichkeit as Wirtschaftlichkeit | null) ?? null,
    verkaufschanceId: z.verkaufschance_id,
    kontaktId: z.kontakt_id ?? '',
    kundennummer: z.kundennummer ?? 0,
    name: z.name ?? '–',
    telefon: z.telefon,
    email: z.email,
    plz: z.plz,
    ort: z.ort,
    strasse: z.strasse,
    imEingang: z.im_eingang ?? false,
    projektId: z.projekt_id,
    werkvertragId: z.werkvertrag_id,
    werkvertragStatus: z.werkvertrag_status,
    geaendertAm: z.geaendert_am,
    suchtext: z.suchtext ?? '',
  }
}

const EINGANG_STATUS = new Set(['neu', 'bearbeitung', 'rueckfrage', 'pruefung', 'offeriert'])

/** Zeile der Ansicht `offerten_eingang` in die App-Form. */
export function eingangAusZeile(z: EingangZeile): Eingang {
  return {
    id: z.id ?? '',
    leadNummer: z.lead_nummer,
    kontaktId: z.kontakt_id ?? '',
    name: z.name ?? '–',
    plz: z.plz,
    ort: z.ort,
    strasse: z.strasse,
    standort: standortVon(z.standort),
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    terminAm: z.termin_am,
    terminPersonId: z.tour_person_id,
    terminPersonName: z.termin_person_name,
    richtofferte: z.richtofferte ?? false,
    zurOfferteAm: z.zur_offerte_am,
    status: EINGANG_STATUS.has(z.offerte_status ?? '') ? (z.offerte_status as EingangStatus) : 'neu',
    von: z.offerte_von,
    seit: z.offerte_seit,
    hinweis: z.offerte_hinweis,
    hinweisVon: z.offerte_hinweis_von,
    rueckfrage: z.offerte_rueckfrage,
    kommentarKunde: z.kommentar_kunde,
    notizIntern: z.notiz_intern,
    offerteId: z.offerte_id,
    offerteNummer: z.offerte_nummer,
    betragRappen: z.betrag_rappen,
    kwp: z.leistung_kwp,
    suchtext: z.suchtext ?? '',
  }
}

/** Alle Offerten (Muri, Bulle, Nachfassen). Gefiltert wird in der App, damit Reiter und Suche sofort reagieren. */
export async function ladeOfferten(): Promise<Offerte[]> {
  const { data, error } = await db().from('offerten_liste').select('*').order('nummer', { ascending: false })
  if (error) throw error
  return data.map(offerteAusZeile)
}

/** «Neue Offerten»: alle Leads, die zur Offerte gegeben wurden. */
export async function ladeEingang(): Promise<Eingang[]> {
  const { data, error } = await db().from('offerten_eingang').select('*')
  if (error) throw error
  return data.map(eingangAusZeile)
}

/** Status in «Neue Offerten» setzen; liefert die Offerte (wird bei Bedarf angelegt). */
export async function setzeEingangStatus(
  verkaufschanceId: string,
  status: EingangStatus,
  angaben: { notiz?: string; datum?: string; uebernehmen?: boolean } = {},
): Promise<string> {
  const { data, error } = await db().rpc('offerte_status_setzen', {
    p_verkaufschance: verkaufschanceId,
    p_status: status,
    p_angaben: angaben as Json,
  })
  if (error) throw error
  return data
}

/** Entscheid beim Nachfassen: nachfassen, vertagt (datum, grund), angenommen, verloren (grund). */
export async function entscheide(
  offerteId: string,
  ziel: 'offeriert' | 'nachfassen' | 'vertagt' | 'angenommen' | 'verloren',
  angaben: { datum?: string; grund?: string; notiz?: string } = {},
): Promise<void> {
  const { error } = await db().rpc('offerte_entscheiden', {
    p_offerte: offerteId,
    p_ziel: ziel,
    p_angaben: angaben as Json,
  })
  if (error) throw error
}

/** Überarbeitete Version erfassen (V67). */
export async function erfasseVersion(
  offerteId: string,
  v: {
    datum: string
    text: string
    betrag_rappen?: number | null
    kwp?: number | null
    batterie?: string
    dokument?: { pfad: string; name: string }
    uebernehmen: boolean
  },
): Promise<number> {
  const { data, error } = await db().rpc('offerte_version_erfassen', { p_offerte: offerteId, p: v as Json })
  if (error) throw error
  return data
}

/** Neueste Version entfernen (nur Admin). */
export async function entferneVersion(offerteId: string): Promise<void> {
  const { error } = await db().rpc('offerte_version_entfernen', { p_offerte: offerteId })
  if (error) throw error
}

/** «Zurück zur Offerte» (V221). */
export async function zurueckZurOfferte(
  offerteId: string,
  ziel: 'bearbeitung' | 'rueckfrage',
  grund: string,
): Promise<void> {
  const { error } = await db().rpc('offerte_zurueck', { p_offerte: offerteId, p_ziel: ziel, p_grund: grund })
  if (error) throw error
}

/** Werte in die Offerte übernehmen (aus PDF oder von Hand); nurLeere füllt nur leere Felder. */
export async function setzeWerte(offerteId: string, werte: Record<string, unknown>, quelle: string, nurLeere = false) {
  const { error } = await db().rpc('offerte_werte_setzen', {
    p_offerte: offerteId,
    p: werte as Json,
    p_quelle: quelle,
    p_nur_leere: nurLeere,
  })
  if (error) throw error
}

/** Neue Offerte zu einem Kontakt (z. B. aus dem PDF-Import, mit der Nummer aus dem PDF). */
export async function legeOfferteAn(angaben: Record<string, unknown>): Promise<string> {
  const { data, error } = await db().rpc('offerte_anlegen', { p: angaben as Json })
  if (error) throw error
  return data
}

/** Zuständige Person ändern (V193: offerPerson von Hand überschreiben). */
export async function setzeVerantwortlich(offerteId: string, personId: string | null): Promise<void> {
  const { error } = await db().from('offerten').update({ verantwortlich_id: personId }).eq('id', offerteId)
  if (error) throw error
}

/**
 * Offert-PDF ablegen: im privaten Speicher unter der Offerte und als Dokument beim Kontakt,
 * damit es auch in der Kundenakte erscheint. Liefert den Speicherpfad.
 */
export async function legePdfAb(
  o: { id: string; kontaktId: string },
  datei: File,
): Promise<{ pfad: string; name: string }> {
  const pfad = `offerten/${o.id}/${Date.now()}-${datei.name.replace(/[^\w.\- ]+/g, '_')}`
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { error } = await db().from('dokumente').insert({
    name: datei.name,
    mime_typ: 'application/pdf',
    bytes: datei.size,
    ordner: 'offerte',
    speicher: 'intern',
    speicher_pfad: pfad,
    bezug_tabelle: 'offerten',
    bezug_id: o.id,
  })
  if (error) throw error
  return { pfad, name: datei.name }
}

/** Dokumente einer Offerte (PDFs der Versionen). */
export async function ladeOffertDokumente(offerteId: string) {
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name, ordner, erstellt_am, sharepoint_url, speicher_pfad')
    .eq('bezug_tabelle', 'offerten')
    .eq('bezug_id', offerteId)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

/** Verlauf einer Offerte: Einträge mit ihrer Nummer oder zu ihrem Lead, neueste zuerst. */
export async function ladeOffertVerlauf(o: { id: string; kontaktId: string; verkaufschanceId: string | null }) {
  const filter = [`details->>offerte_id.eq.${o.id}`]
  if (o.verkaufschanceId) filter.push(`verkaufschance_id.eq.${o.verkaufschanceId}`)
  const { data, error } = await db()
    .from('aktivitaeten')
    .select('id, art, zeitpunkt, text, details, person_id')
    .eq('kontakt_id', o.kontaktId)
    .or(filter.join(','))
    .is('geloescht_am', null)
    .order('zeitpunkt', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

/** Personen für «Zuständig» (alle aktiven). */
export async function ladePersonen(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Offene Meldungen aus Eturnity (Webhook), neueste zuerst. */
export async function ladeEturnityMeldungen(): Promise<EturnityMeldung[]> {
  const { data, error } = await db()
    .from('eturnity_eingang')
    .select('id, ereignis, eturnity_id, offertnummer, empfangen_am, daten')
    .is('erledigt_am', null)
    .is('geloescht_am', null)
    .order('empfangen_am', { ascending: false })
    .limit(50)
  if (error) throw error
  return data.map((m) => ({
    id: m.id,
    ereignis: m.ereignis,
    eturnityId: m.eturnity_id,
    offertnummer: m.offertnummer,
    empfangenAm: m.empfangen_am,
    daten: m.daten,
  }))
}

/** Meldung einer Offerte zuordnen oder ohne Zuordnung erledigen (offerteId = null). */
export async function ordneEturnityZu(meldungId: string, offerteId: string | null): Promise<void> {
  const { error } = await db().rpc('eturnity_zuordnen', { p_eingang: meldungId, p_offerte: offerteId as string })
  if (error) throw error
}
