import { supabase } from '@/services/supabase'
import type { FahrplanSchritt, Projekt, ProjektStatus, SchrittStand, Standort } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, nummer, titel, status, bau_status, material_status, baubeginn, werktage, unterzeichnet_am, vertragswert_rappen, vertrag_sprache, elektriker, architekt, bau_vorher, standort_id, kontakt_id, objekt_id, offerte_id, ' +
  'kontakt:kontakte(vorname, nachname, firma, telefon, email, sprache), objekt:objekte(strasse, plz, ort), ' +
  'offerte:offerten(leistung_kwp, anzahl_module, wechselrichter, batterie, standort_id), standort:standorte(id, kuerzel, name), ' +
  'verantwortlich:personen(name), ablauf:ablauf_vorlagen(schluessel)'

interface Roh {
  id: string
  nummer: string
  titel: string | null
  status: ProjektStatus
  bau_status: Projekt['bau_status']
  material_status: Projekt['material_status']
  baubeginn: string | null
  werktage: number | null
  unterzeichnet_am: string | null
  vertragswert_rappen: number | null
  vertrag_sprache: string | null
  elektriker: string | null
  architekt: string | null
  bau_vorher: unknown
  standort_id: string | null
  kontakt_id: string
  objekt_id: string | null
  offerte_id: string | null
  kontakt: {
    vorname: string | null
    nachname: string | null
    firma: string | null
    telefon: string | null
    email: string | null
    sprache: string | null
  } | null
  objekt: { strasse: string | null; plz: string | null; ort: string | null } | null
  offerte: {
    leistung_kwp: number | null
    anzahl_module: number | null
    wechselrichter: string | null
    batterie: string | null
    standort_id: string | null
  } | null
  standort: { id: string; kuerzel: string; name: string } | null
  verantwortlich: { name: string } | null
  ablauf: { schluessel: string } | null
}

/** Name eines Kontakts: Firma, sonst Vorname und Name. */
function kundeName(k: Roh['kontakt']): string {
  if (!k) return '–'
  return k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ') || '–'
}

function alsProjekt(r: Roh, standorte: Standort[], stand: Map<string, Projekt['stand']>): Projekt {
  const sprache = (r.vertrag_sprache ?? r.kontakt?.sprache) === 'fr' ? 'fr' : 'de'
  // Wie V233 (V125): ohne gespeicherten Standort gilt der der Offerte, sonst die Sprache (fr = Bulle).
  const sid = r.standort_id ?? r.offerte?.standort_id ?? null
  const std =
    standorte.find((s) => s.id === sid) ?? standorte.find((s) => s.kuerzel === (sprache === 'fr' ? 'bulle' : 'muri'))
  return {
    id: r.id,
    nummer: r.nummer,
    titel: r.titel,
    status: r.status,
    bau_status: r.bau_status,
    material_status: r.material_status,
    baubeginn: r.baubeginn,
    werktage: r.werktage,
    unterzeichnet_am: r.unterzeichnet_am,
    vertragswert_rappen: r.vertragswert_rappen,
    vertrag_sprache: r.vertrag_sprache,
    elektriker: r.elektriker,
    architekt: r.architekt,
    bau_vorher: r.bau_vorher,
    standort_id: std?.id ?? null,
    standort: std?.name ?? null,
    kontakt_id: r.kontakt_id,
    kunde: kundeName(r.kontakt),
    telefon: r.kontakt?.telefon ?? null,
    email: r.kontakt?.email ?? null,
    sprache,
    objekt_id: r.objekt_id,
    strasse: r.objekt?.strasse ?? null,
    plz: r.objekt?.plz ?? null,
    ort: r.objekt?.ort ?? null,
    offerte_id: r.offerte_id,
    leistung_kwp: r.offerte?.leistung_kwp ?? null,
    anzahl_module: r.offerte?.anzahl_module ?? null,
    wechselrichter: r.offerte?.wechselrichter ?? null,
    batterie: r.offerte?.batterie ?? null,
    verantwortlich: r.verantwortlich?.name ?? null,
    ablauf: r.ablauf?.schluessel ?? null,
    stand: stand.get(r.id) ?? null,
  }
}

/** Standorte (Muri, Bulle) für Gruppen und Auswahl. */
export async function ladeStandorte(): Promise<Standort[]> {
  const { data, error } = await db()
    .from('standorte')
    .select('id, kuerzel, name')
    .is('geloescht_am', null)
    .order('name', { ascending: false })
  if (error) throw error
  return data
}

/** Fahrplan-Zusammenfassung aller Projekte (Balken, nächster Schritt), einmal geladen für alle Listen. */
async function ladeStand(): Promise<Map<string, Projekt['stand']>> {
  const { data, error } = await db().from('projekt_stand').select('*')
  if (error) throw error
  return new Map(data.map((z) => [z.projekt_id ?? '', z as unknown as NonNullable<Projekt['stand']>]))
}

/** Projekte in einem oder mehreren Status, mit Kunde, Ort, Anlage aus der Offerte und Fahrplan-Stand. */
export async function ladeProjekte(status: ProjektStatus[]): Promise<Projekt[]> {
  const [roh, standorte, stand] = await Promise.all([
    db().from('projekte').select(FELDER).is('geloescht_am', null).in('status', status).order('nummer').limit(2000),
    ladeStandorte(),
    ladeStand(),
  ])
  if (roh.error) throw roh.error
  return (roh.data as unknown as Roh[]).map((r) => alsProjekt(r, standorte, stand))
}

/** Ein Projekt für die Akte. */
export async function ladeProjekt(id: string): Promise<Projekt> {
  const [roh, standorte, stand] = await Promise.all([
    db().from('projekte').select(FELDER).eq('id', id).single(),
    ladeStandorte(),
    db().from('projekt_stand').select('*').eq('projekt_id', id).maybeSingle(),
  ])
  if (roh.error) throw roh.error
  if (stand.error) throw stand.error
  const m = new Map<string, Projekt['stand']>()
  if (stand.data) m.set(id, stand.data as unknown as NonNullable<Projekt['stand']>)
  return alsProjekt(roh.data as unknown as Roh, standorte, m)
}

/** Fahrplan eines Projekts, Schritt für Schritt. */
export async function ladeFahrplan(projektId: string): Promise<FahrplanSchritt[]> {
  const { data, error } = await db()
    .from('projekt_fahrplan')
    .select('*')
    .eq('projekt_id', projektId)
    .order('reihenfolge')
  if (error) throw error
  return data as unknown as FahrplanSchritt[]
}

/** Alle Bewilligungs-Schritte laufender Projekte (Reiter Bewilligungen, Startseite). */
export async function ladeBewilligungen(): Promise<FahrplanSchritt[]> {
  const { data, error } = await db().from('projekt_fahrplan').select('*').eq('bewilligung', true).order('reihenfolge')
  if (error) throw error
  return data as unknown as FahrplanSchritt[]
}

/** Einen Fahrplan-Schritt setzen (Stand, Datum, Frist, Notiz). */
export async function schrittSetzen(
  projektId: string,
  schluessel: string,
  p: { stand?: SchrittStand; datum?: string; frist?: string; notiz?: string },
): Promise<void> {
  const { error } = await db().rpc('projekt_schritt_setzen', { p_projekt: projektId, p_schluessel: schluessel, p })
  if (error) throw error
}

/** In den Bau übernehmen, mit oder ohne Termin; gibt «ohne_termin», «geplant» oder «gebaut» zurück. */
export async function bauPlanen(
  projektId: string,
  p: { standort_id?: string; von?: string; bis?: string },
): Promise<'ohne_termin' | 'geplant' | 'gebaut'> {
  const { data, error } = await db().rpc('projekt_bau_planen', { p_id: projektId, p })
  if (error) throw error
  return data as 'ohne_termin' | 'geplant' | 'gebaut'
}

/** Baustelle zurück zu den Aufträgen. */
export async function bauZuruecknehmen(projektId: string): Promise<void> {
  const { error } = await db().rpc('projekt_bau_zuruecknehmen', { p_id: projektId })
  if (error) throw error
}

/** Den letzten Bau-Schritt rückgängig machen. */
export async function bauRueckgaengig(projektId: string): Promise<void> {
  const { error } = await db().rpc('projekt_bau_rueckgaengig', { p_id: projektId })
  if (error) throw error
}

/** Angaben eines Projekts ändern (Elektriker, Architekt, Standort, Werktage, Ablauf). */
export async function projektAendern(
  projektId: string,
  p: Partial<{
    elektriker: string | null
    architekt: string | null
    standort_id: string | null
    werktage: number | null
    ablauf_vorlage_id: string
  }>,
): Promise<void> {
  const { error } = await db().from('projekte').update(p).eq('id', projektId)
  if (error) throw error
}

/** Ablauf-Vorlagen (PV, Wärmepumpe, Speicher, Wallbox). */
export async function ladeAblaeufe(): Promise<{ id: string; schluessel: string; name_de: string; name_fr: string }[]> {
  const { data, error } = await db()
    .from('ablauf_vorlagen')
    .select('id, schluessel, name_de, name_fr')
    .is('geloescht_am', null)
    .eq('aktiv', true)
  if (error) throw error
  return data
}
