import { supabase } from '@/services/supabase'
import type { Anlage, FallEingabe, Komponente, FallFilter, Person, ServiceFall, Verlaufseintrag } from '../types'

/** Datenzugriff für Service-Fälle, Anlagen, Anhänge und Aufgaben. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

type Kontakt = { vorname: string | null; nachname: string | null; firma: string | null; sprache: string | null } | null
const kundeName = (k: Kontakt) =>
  k ? k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ') || '–' : '–'

const FALL_FELDER =
  'id, nummer, titel, beschreibung, kategorie, prioritaet, status, garantie, termin_am, erledigt_am, erstellt_am, kontakt_id, anlage_id, projekt_id, person_id, verlauf, ' +
  'kontakt:kontakte(vorname, nachname, firma, sprache), anlage:anlagen(objekt:objekte(ort)), projekt:projekte(nummer), person:personen(name)'

type FallRoh = Omit<ServiceFall, 'kunde' | 'ort' | 'sprache' | 'projekt' | 'person' | 'verlauf'> & {
  verlauf: unknown
  kontakt: Kontakt
  anlage: { objekt: { ort: string | null } | null } | null
  projekt: { nummer: string } | null
  person: { name: string } | null
}

function alsFall({ kontakt, anlage, projekt, person, verlauf, ...f }: FallRoh): ServiceFall {
  return {
    ...f,
    verlauf: Array.isArray(verlauf) ? (verlauf as Verlaufseintrag[]) : [],
    kunde: kundeName(kontakt),
    ort: anlage?.objekt?.ort ?? null,
    sprache: kontakt?.sprache === 'fr' ? 'fr' : 'de',
    projekt: projekt?.nummer ?? null,
    person: person?.name ?? null,
  }
}

/** Service-Fälle nach Filter, neueste zuerst. */
export async function ladeFaelle(filter: FallFilter): Promise<ServiceFall[]> {
  let q = db().from('service_faelle').select(FALL_FELDER).is('geloescht_am', null)
  if (filter === 'offen') q = q.neq('status', 'erledigt')
  if (filter === 'hoch') q = q.neq('status', 'erledigt').eq('prioritaet', 'hoch')
  if (filter === 'garantie') q = q.eq('garantie', true)
  if (filter === 'erledigt') q = q.eq('status', 'erledigt')
  const { data, error } = await q.order('erstellt_am', { ascending: false }).limit(500)
  if (error) throw error
  return (data as unknown as FallRoh[]).map(alsFall)
}

/** Ein Fall für die Akte. */
export async function ladeFall(id: string): Promise<ServiceFall> {
  const { data, error } = await db().from('service_faelle').select(FALL_FELDER).eq('id', id).single()
  if (error) throw error
  return alsFall(data as unknown as FallRoh)
}

/** Fall anlegen (gibt die ID zurück) oder ändern. */
export async function fallSpeichern(e: Partial<FallEingabe>, id?: string): Promise<string> {
  if (id) {
    const { error } = await db().from('service_faelle').update(e).eq('id', id)
    if (error) throw error
    return id
  }
  const { data, error } = await db()
    .from('service_faelle')
    // Leere Nummer: die Datenbank vergibt S001 … (Trigger service_fall_vorbereiten).
    .insert({ ...e, titel: e.titel ?? '', nummer: '' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Eintrag im Verlauf (mit Datum und Person, von der Datenbank gesetzt). */
export async function fallNotiz(id: string, text: string): Promise<void> {
  const { error } = await db().rpc('service_notiz', { p_id: id, p_text: text })
  if (error) throw error
}

/** Aufgabe zum Fall anlegen, damit er in «Aufgaben» der zuständigen Person erscheint. */
export async function aufgabeZumFall(f: ServiceFall, faellig: string): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .insert({
      titel: `${f.nummer}: ${f.titel}`,
      text: f.beschreibung,
      faellig_am: faellig,
      person_id: f.person_id,
      bezug_tabelle: 'service_faelle',
      bezug_id: f.id,
    })
  if (error) throw error
}

/** Anhänge eines Falls. */
export async function ladeAnhaenge(id: string) {
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name, erstellt_am, sharepoint_url, speicher_pfad')
    .eq('bezug_tabelle', 'service_faelle')
    .eq('bezug_id', id)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

/** Datei zum Fall ablegen (Foto, Rapport, Lieferschein) im privaten Speicher. */
export async function anhangHochladen(id: string, datei: File): Promise<void> {
  const pfad = `service/${id}/${String(Date.now())}-${datei.name.replace(/[^\w.\- ]+/g, '_')}`
  const hoch = await db()
    .storage.from('dokumente')
    .upload(pfad, datei, { contentType: datei.type || 'application/octet-stream' })
  if (hoch.error) throw hoch.error
  const { error } = await db()
    .from('dokumente')
    .insert({
      name: datei.name,
      mime_typ: datei.type || null,
      bytes: datei.size,
      ordner: 'service',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'service_faelle',
      bezug_id: id,
    })
  if (error) throw error
}

const ANLAGE_FELDER =
  'id, objekt_id, projekt_id, ibn_am, garantie_bis, naechste_kontrolle, leistung_kwp, komponenten, monitoring, notiz, ' +
  'objekt:objekte(strasse, plz, ort, kontakt_id, kontakt:kontakte(vorname, nachname, firma, sprache)), projekt:projekte(nummer)'

type AnlageRoh = Omit<Anlage, 'kontakt_id' | 'kunde' | 'adresse' | 'projekt' | 'komponenten' | 'monitoring'> & {
  komponenten: unknown
  monitoring: unknown
  objekt: {
    strasse: string | null
    plz: string | null
    ort: string | null
    kontakt_id: string
    kontakt: Kontakt
  } | null
  projekt: { nummer: string } | null
}

function alsAnlage({ objekt, projekt, komponenten, monitoring, ...a }: AnlageRoh): Anlage {
  return {
    ...a,
    // Aus Offerte oder Import fehlen oft Hersteller und Seriennummer: leere Texte statt «undefined».
    komponenten: (Array.isArray(komponenten) ? (komponenten as Partial<Komponente>[]) : []).map((k) => ({
      art: k.art ?? 'pv',
      hersteller: k.hersteller ?? '',
      modell: k.modell ?? '',
      anzahl: k.anzahl ?? null,
      seriennummer: k.seriennummer ?? '',
      garantie_bis: k.garantie_bis ?? null,
    })),
    monitoring: monitoring && typeof monitoring === 'object' ? (monitoring) : null,
    kontakt_id: objekt?.kontakt_id ?? null,
    kunde: kundeName(objekt?.kontakt ?? null),
    adresse: [objekt?.strasse, [objekt?.plz, objekt?.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    projekt: projekt?.nummer ?? null,
  }
}

/** Alle Anlagen, nächste Kontrolle zuerst. */
export async function ladeAnlagen(): Promise<Anlage[]> {
  const { data, error } = await db()
    .from('anlagen')
    .select(ANLAGE_FELDER)
    .is('geloescht_am', null)
    .order('naechste_kontrolle', { nullsFirst: false })
    .limit(2000)
  if (error) throw error
  return (data as unknown as AnlageRoh[]).map(alsAnlage)
}

/** Anlagen eines Kunden (über seine Objekte), für die Auswahl im Fall. */
export async function ladeKundenAnlagen(kontaktId: string): Promise<Anlage[]> {
  const { data, error } = await db()
    .from('anlagen')
    .select(ANLAGE_FELDER.replace('objekt:objekte(', 'objekt:objekte!inner('))
    .eq('objekt.kontakt_id', kontaktId)
    .is('geloescht_am', null)
  if (error) throw error
  return (data as unknown as AnlageRoh[]).map(alsAnlage)
}

/** Anlage-Daten ändern. */
export async function anlageSpeichern(
  id: string,
  a: Pick<
    Anlage,
    'ibn_am' | 'garantie_bis' | 'naechste_kontrolle' | 'leistung_kwp' | 'komponenten' | 'monitoring' | 'notiz'
  >,
): Promise<void> {
  const { error } = await db()
    .from('anlagen')
    .update({ ...a, komponenten: a.komponenten as never, monitoring: a.monitoring as never })
    .eq('id', id)
  if (error) throw error
}

/** Aktive Personen für «zuständig». */
export async function ladePersonen(): Promise<Person[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}
