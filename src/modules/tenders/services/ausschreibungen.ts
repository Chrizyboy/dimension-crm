import type { Json } from '@/types/datenbank'
import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type {
  Anschreiben,
  Dossier,
  DossierKontakt,
  ListenFilter,
  MonitorRegeln,
  QuellenLauf,
  Sperre,
  Tagesbericht,
  TrichterZeile,
} from '../types'
import { ERLEDIGT } from '../lib/anzeige'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const DOSSIER_FELDER =
  'id, nummer, quelle, quell_url, art, spur, status, prioritaet, punkte, begruendung, titel, beschreibung, gemeinde, plz, kanton, sprache, fahrzeit_min, vergabestelle, frist, frist_fragen, frist_begehung, frist_eingabe, publiziert_am, parzelle, bauherr, bauherr_art, ausloeser, ausloeser_am, grund, haupt_id, korrigiert_am, wiedervorlage_am, eingereicht_am, eingereicht_form, offerte_id, verkaufschance_id, erstellt_am, standort:standorte(name)'

type DossierRoh = Omit<Dossier, 'standort'> & { standort: { name: string } | null }
const alsDossier = ({ standort, ...d }: DossierRoh): Dossier => ({ ...d, standort: standort?.name ?? null })

/** Dossiers einer Ansicht (ohne Doppelte, die zu einem anderen Dossier gehören), dringende zuerst. */
export async function ladeDossiers(filter: ListenFilter | 'pruefen'): Promise<Dossier[]> {
  let q = db().from('ausschreibungen').select(DOSSIER_FELDER).is('geloescht_am', null).is('haupt_id', null)
  const erledigt = `(${ERLEDIGT.join(',')})`
  if (filter === 'pruefen') q = q.in('status', ['pruefen', 'kontakt_fehlt', 'antwort'])
  else if (filter === 'erledigt') q = q.in('status', ERLEDIGT)
  else {
    q = q.not('status', 'in', erledigt)
    if (filter !== 'offen') q = q.eq('spur', filter)
  }
  const { data, error } = await q
    .order('prioritaet', { ascending: true, nullsFirst: false })
    .order('frist', { ascending: true, nullsFirst: false })
    .limit(500)
  if (error) throw error
  return (data as unknown as DossierRoh[]).map(alsDossier)
}

/** Ein Dossier mit den Meldungen, die dazugehören (gleiche Gemeinde und Parzelle oder Bauherrschaft). */
export async function ladeDossier(id: string): Promise<{ dossier: Dossier; doppelte: Dossier[] }> {
  const [eins, mehr] = await Promise.all([
    db().from('ausschreibungen').select(DOSSIER_FELDER).eq('id', id).single(),
    db().from('ausschreibungen').select(DOSSIER_FELDER).eq('haupt_id', id).is('geloescht_am', null),
  ])
  if (eins.error) throw eins.error
  if (mehr.error) throw mehr.error
  return {
    dossier: alsDossier(eins.data as unknown as DossierRoh),
    doppelte: (mehr.data as unknown as DossierRoh[]).map(alsDossier),
  }
}

/** Kontakte eines Dossiers. */
export async function ladeKontakte(id: string): Promise<DossierKontakt[]> {
  const { data, error } = await db()
    .from('ausschreibung_kontakte')
    .select(
      'id, ausschreibung_id, rolle, art, name, firma, email, telefon, strasse, plz, ort, sprache, quelle_link, notiz, kontakt_id',
    )
    .eq('ausschreibung_id', id)
    .is('geloescht_am', null)
    .order('erstellt_am')
  if (error) throw error
  return data as DossierKontakt[]
}

const ANSCHREIBEN_FELDER =
  'id, ausschreibung_id, dossier_kontakt_id, kanal, art, sprache, an, betreff, text, status, abgelehnt_grund, bewilligt_am, versendet_am, antwort_am, antwort_art, verkaufschance_id, erstellt_am, dossier:ausschreibungen(nummer, titel, gemeinde, prioritaet, frist), kontakt:ausschreibung_kontakte(name, firma), bewilliger:personen!anschreiben_bewilligt_von_fkey(name)'

type AnschreibenRoh = Omit<Anschreiben, 'empfaenger' | 'bewilligt_durch'> & {
  kontakt: { name: string; firma: string | null } | null
  bewilliger: { name: string } | null
}
const alsAnschreiben = ({ kontakt, bewilliger, ...a }: AnschreibenRoh): Anschreiben => ({
  ...a,
  empfaenger: kontakt?.firma ?? kontakt?.name ?? '',
  bewilligt_durch: bewilliger?.name ?? null,
})

/** Anschreiben eines Status (Entwurf = zum Bewilligen, bewilligt = zum Senden) oder eines Dossiers. */
export async function ladeAnschreiben(o: {
  status?: 'entwurf' | 'bewilligt'
  dossier?: string
}): Promise<Anschreiben[]> {
  let q = db().from('anschreiben').select(ANSCHREIBEN_FELDER).is('geloescht_am', null)
  if (o.status) q = q.eq('status', o.status)
  if (o.dossier) q = q.eq('ausschreibung_id', o.dossier)
  const { data, error } = await q.order('erstellt_am', { ascending: !o.dossier }).limit(300)
  if (error) throw error
  return (data as unknown as AnschreibenRoh[]).map(alsAnschreiben)
}

/** Text, wie er hinausgeht (mit fester Signatur und Abmelde-Satz). */
export async function volltext(id: string): Promise<string> {
  const { data, error } = await db().rpc('anschreiben_volltext', { p_id: id })
  if (error) throw error
  return data
}

/** Verlauf eines Dossiers. */
export async function ladeVerlauf(id: string) {
  const { data, error } = await db()
    .from('aktivitaeten')
    .select('id, art, richtung, zeitpunkt, text, person:personen(name)')
    .eq('ausschreibung_id', id)
    .is('geloescht_am', null)
    .order('zeitpunkt', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as unknown as {
    id: string
    art: string
    richtung: string | null
    zeitpunkt: string
    text: string | null
    person: { name: string } | null
  }[]
}

/** Entscheid zu einem oder mehreren Dossiers (teilnehmen, nicht teilnehmen, später, verwerfen …). */
export async function entscheiden(
  ids: string[],
  entscheid: string,
  angaben: Record<string, string> = {},
): Promise<void> {
  const [eins] = ids
  const { error } =
    ids.length === 1 && eins
      ? await db().rpc('ausschreibung_entscheiden', { p_id: eins, p_entscheid: entscheid, p_angaben: angaben })
      : await db().rpc('ausschreibungen_entscheiden', { p_ids: ids, p_entscheid: entscheid, p_angaben: angaben })
  if (error) throw error
}

/** Kontakt am Dossier speichern (neu oder ändern). */
export async function kontaktSpeichern(k: Partial<DossierKontakt> & { ausschreibung_id: string }): Promise<void> {
  const { error } = await db().rpc('dossier_kontakt_speichern', { p: k as unknown as Json })
  if (error) throw error
}

/** Entwurf für einen Kontakt anlegen (erst oder nachfassen). */
export async function entwerfen(kontaktId: string, art: 'erst' | 'nachfassen' = 'erst'): Promise<void> {
  const { error } = await db().rpc('anschreiben_entwerfen', { p_kontakt: kontaktId, p_art: art })
  if (error) throw error
}

/** Betreff und Text eines Entwurfs ändern. */
export async function anschreibenAendern(id: string, betreff: string, text: string): Promise<void> {
  const { error } = await db().rpc('anschreiben_aendern', { p_id: id, p_betreff: betreff, p_text: text })
  if (error) throw error
}

/** Bewilligen (mehrere auf einmal). */
export async function bewilligen(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('anschreiben_bewilligen', { p_ids: ids })
  if (error) throw error
  return data
}

/** Ablehnen mit Grund. */
export async function ablehnen(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('anschreiben_ablehnen', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Senden: Mail in den Ausgangskorb, Brief als gedruckt, Anruf als Aufgabe. Erst jetzt entsteht der Lead. */
export async function senden(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('anschreiben_senden', { p_ids: ids })
  if (error) throw error
  return data
}

/** Antwort festhalten. */
export async function antwort(id: string, art: 'interesse' | 'kein_interesse' | 'keine_werbung'): Promise<void> {
  const { error } = await db().rpc('anschreiben_antwort', { p_id: id, p_art: art })
  if (error) throw error
}

/** Meldung von Hand erfassen (Amtsblatt AG, Feuille officielle FR …). Gibt die id zurück. */
export async function erfassen(p: Record<string, unknown>): Promise<string> {
  const { data, error } = await db().rpc('ausschreibung_erfassen', { p: p as Json })
  if (error) throw error
  return data
}

/** Sperrliste (aktive zuerst). */
export async function ladeSperren(): Promise<Sperre[]> {
  const { data, error } = await db()
    .from('kontaktsperren')
    .select('id, art, wert, grund, bis, aufgehoben_am, erstellt_am, ausschreibung_id')
    .is('geloescht_am', null)
    .order('aufgehoben_am', { ascending: false, nullsFirst: true })
    .order('erstellt_am', { ascending: false })
    .limit(500)
  if (error) throw error
  return data as Sperre[]
}

/** Auf die Sperrliste setzen. */
export async function sperren(art: Sperre['art'], wert: string, grund: string): Promise<void> {
  const { error } = await db().rpc('kontaktsperre_anlegen', { p_art: art, p_wert: wert, p_grund: grund })
  if (error) throw error
}

/** Sperre aufheben. */
export async function entsperren(id: string): Promise<void> {
  const { error } = await db().rpc('kontaktsperre_aufheben', { p_id: id })
  if (error) throw error
}

/** Letzte Läufe der Quellen. */
export async function ladeLaeufe(): Promise<QuellenLauf[]> {
  const { data, error } = await db()
    .from('quellen_laeufe')
    .select('id, quelle, beginn, ende, ok, gelesen, neu, aktualisiert, meldung')
    .is('geloescht_am', null)
    .order('beginn', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

/** Eine Quelle jetzt abrufen (Server). */
export const quelleAbrufen = (quelle: 'simap' | 'amtsblatt') =>
  rufeFunktion<{ ergebnis: { ok: boolean; neu: number; aktualisiert: number; gelesen: number; meldung: string } }>(
    'ausschreibungen',
    'lesen',
    { quelle },
  )

/** Täglichen Lauf von Hand starten (nur Administration). */
export async function jetztPruefen(): Promise<Record<string, number>> {
  const { data, error } = await db().rpc('ausschreibungen_pruefen')
  if (error) throw error
  return data as Record<string, number>
}

/** Zahlen für Reiter und Startseite. */
export async function ladeTagesbericht(): Promise<Tagesbericht> {
  const { data, error } = await db().rpc('ausschreibungen_tagesbericht')
  if (error) throw error
  return data as unknown as Tagesbericht
}

/** Trichter für einen Zeitraum. */
export async function ladeTrichter(von: string, bis: string): Promise<TrichterZeile[]> {
  const { data, error } = await db().rpc('ausschreibungen_trichter', { p_von: von, p_bis: bis })
  if (error) throw error
  return data
}

/** Regeln des Monitors lesen. */
export async function ladeRegeln(): Promise<MonitorRegeln> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'ausschreibungen').single()
  if (error) throw error
  return data.wert as unknown as MonitorRegeln
}

/** Regeln ändern (nur die übergebenen Felder; Texte und Stichworte bleiben). */
export async function regelnSpeichern(aenderung: Partial<MonitorRegeln>): Promise<void> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'ausschreibungen').single()
  if (error) throw error
  const wert = { ...(data.wert as Record<string, Json>), ...(aenderung as Record<string, Json>) }
  const r = await db().from('einstellungen').update({ wert }).eq('schluessel', 'ausschreibungen')
  if (r.error) throw r.error
}
