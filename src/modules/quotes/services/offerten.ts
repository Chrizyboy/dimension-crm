import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { Eingang, EingangStatus, EturnityMeldung, Offerte } from '../types'
import { alleSeiten } from '@/services/seiten'
import { eingangAusZeile, offerteAusZeile } from './zeilen'

export { eingangAusZeile, offerteAusZeile, versionenAus } from './zeilen'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alle Offerten (Muri, Bulle, Nachfassen). Gefiltert wird in der App, damit Reiter und Suche sofort reagieren. */
export async function ladeOfferten(): Promise<Offerte[]> {
  const data = await alleSeiten((von, bis) =>
    db().from('offerten_liste').select('*').order('nummer', { ascending: false }).order('id').range(von, bis),
  )
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
