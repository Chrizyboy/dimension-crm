import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type {
  Ansprechperson,
  Besichtigung,
  Kontakt,
  RechnungWerte,
  Stufe,
  YouderaStand,
  Grossprojekt,
  GrossprojektRegeln,
  PersonKurz,
  Recherche,
  SucheRegeln,
  SucheStand,
  Vermerk,
} from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, nummer, titel, beschreibung, quelle, quell_url, ausschreibung_id, strasse, plz, gemeinde, kanton, parzelle, sprache, fahrzeit_min, lage_e, lage_n, bauherr, bauherr_art, nutzung, geschuetzt, heizungsersatz, dachflaeche_m2, dach_klasse, stromertrag_kwh, heizung, heizung_jahr, waermeleistung_kw, wohnungen, baujahr, egid, angereichert_am, anreicherung, punkte, punkte_details, art, ausschluss, schaetzung, stand, wiedervorlage_am, grund, entschieden_am, verkaufschance_id, notiz, erstellt_am, recherche, recherche_stand, recherche_am, ansprechperson, verantwortlich_id, stufe, stufe_seit, naechster_schritt, naechster_schritt_am, kontakte, unterlagen, rechnung, youdera, besichtigung, vertrag_am, vertrag_kwp, standort:standorte(name), entschieder:personen!grossprojekte_entschieden_von_fkey(name)'

type Roh = Omit<Grossprojekt, 'standort' | 'entschieden_von'> & {
  standort: { name: string } | null
  entschieder: { name: string } | null
}
const alsGrossprojekt = ({ standort, entschieder, ...g }: Roh): Grossprojekt => ({
  ...g,
  standort: standort?.name ?? null,
  entschieden_von: entschieder?.name ?? null,
})

/** Alle Grossprojekte (ohne Papierkorb), die besten zuerst. Die Reiter filtern in der App. */
export async function ladeGrossprojekte(): Promise<Grossprojekt[]> {
  const { data, error } = await db()
    .from('grossprojekte')
    .select(FELDER)
    .is('geloescht_am', null)
    .order('punkte', { ascending: false })
    .order('erstellt_am', { ascending: false })
    .limit(1000)
  if (error) throw error
  return (data as unknown as Roh[]).map(alsGrossprojekt)
}

/** Verlauf eines Grossprojekts, neueste zuerst. */
export async function ladeVerlauf(id: string): Promise<Vermerk[]> {
  const { data, error } = await db()
    .from('aktivitaeten')
    .select('id, zeitpunkt, text, details, person:personen(name)')
    .eq('grossprojekt_id', id)
    .is('geloescht_am', null)
    .order('zeitpunkt', { ascending: false })
    .limit(100)
  if (error) throw error
  type Zeile = Omit<Vermerk, 'person' | 'art'> & { person: { name: string } | null; details: { art?: string } | null }
  return (data as unknown as Zeile[]).map(({ details, ...v }) => ({
    ...v,
    person: v.person?.name ?? null,
    art: details?.art ?? null,
  }))
}

/** Annahmen und Schwellen (Einstellung «grossprojekte»). */
export async function ladeRegeln(): Promise<GrossprojektRegeln> {
  const { data, error } = await db()
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'grossprojekte')
    .maybeSingle()
  if (error) throw error
  return (data?.wert ?? {}) as GrossprojektRegeln
}

/** Annahmen ändern (nur Administration; die Datenbank prüft das). Ändert nur «annahmen» und «melden_ab». */
export async function speichereAnnahmen(
  werte: Pick<GrossprojektRegeln, 'annahmen' | 'melden_ab'> & { youdera_mail?: string },
): Promise<void> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'grossprojekte').single()
  if (error) throw error
  const alt = data.wert as GrossprojektRegeln
  const neu = {
    ...alt,
    melden_ab: werte.melden_ab,
    annahmen: { ...alt.annahmen, ...werte.annahmen },
    ...(werte.youdera_mail === undefined ? {} : { pipeline: { ...alt.pipeline, youdera_mail: werte.youdera_mail } }),
  }
  const r = await db()
    .from('einstellungen')
    .update({ wert: neu as never })
    .eq('schluessel', 'grossprojekte')
  if (r.error) throw r.error
}

/** Erfassen oder ändern; gibt die id zurück. Leere Felder werden geleert. */
export async function speichern(werte: Record<string, unknown>): Promise<string> {
  const { data, error } = await db().rpc('grossprojekt_speichern', { p: werte as never })
  if (error) throw error
  return data
}

/** Entscheid: bewilligen (gibt den Lead zurück), beobachten, verwerfen, zurueck. */
export async function entscheiden(
  id: string,
  entscheid: 'bewilligen' | 'beobachten' | 'verwerfen' | 'zurueck',
  angaben: { grund?: string; wiedervorlage_am?: string } = {},
): Promise<string | null> {
  const { data, error } = await db().rpc('grossprojekt_entscheiden', {
    p_id: id,
    p_entscheid: entscheid,
    p_angaben: angaben,
  })
  if (error) throw error
  return data
}

/** Gebäudedaten jetzt holen (sonnendach.ch und Gebäuderegister). Gibt zurück, was gefunden wurde. */
export async function anreichern(id: string): Promise<string> {
  const r = await rufeFunktion<{ meldung: string }>('grossprojekte', 'anreichern', { id })
  return r.meldung
}

/** Wie weit die Dachsuche ist (Gebiete durchsucht, Treffer). */
export async function ladeSucheStand(): Promise<SucheStand> {
  const { data, error } = await db().rpc('grossprojekt_suche_stand')
  if (error) throw error
  return data as unknown as SucheStand
}

/** Dachsuche ein- oder ausschalten (nur Administration; die Datenbank prüft das). */
export async function setzeSucheAktiv(aktiv: boolean): Promise<void> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'grossprojekte').single()
  if (error) throw error
  const alt = data.wert as GrossprojektRegeln
  const r = await db()
    .from('einstellungen')
    .update({ wert: { ...alt, suche: { ...alt.suche, aktiv } } as never })
    .eq('schluessel', 'grossprojekte')
  if (r.error) throw r.error
}

/**
 * Regeln der Dachsuche ändern (Gebiete, Mindestgrössen, Punkte, pro Woche) und wer neue Grossprojekte betreut. Nur
 * die Administration; die Datenbank prüft das (Trigger einstellung_schuetzen).
 */
export async function speichereSuche(suche: SucheRegeln, verantwortlich?: string): Promise<void> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'grossprojekte').single()
  if (error) throw error
  const alt = data.wert as GrossprojektRegeln
  const neu: GrossprojektRegeln = {
    ...alt,
    suche: { ...alt.suche, ...suche },
    ...(verantwortlich ? { verantwortlich: [verantwortlich] } : {}),
  }
  const r = await db()
    .from('einstellungen')
    .update({ wert: neu as never })
    .eq('schluessel', 'grossprojekte')
  if (r.error) throw r.error
}

/** Aktive Personen für «verantwortlich». */
export async function ladePersonen(): Promise<PersonKurz[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, kuerzel, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Wer bei uns das Grossprojekt betreut. */
export async function verantwortlichSetzen(id: string, person: string): Promise<void> {
  const { error } = await db().rpc('grossprojekt_verantwortlich_setzen', { p_id: id, p_person: person })
  if (error) throw error
}

/** Recherche (neu) anstossen; der Zeitplan macht sie innert einer halben Stunde. */
export async function rechercheAnfordern(id: string): Promise<void> {
  const { error } = await db().rpc('grossprojekt_recherche_anfordern', { p_id: id })
  if (error) throw error
}

/** Vorschlag übernehmen: Eigentümer als Bauherrschaft und/oder eine Ansprechperson. */
export async function rechercheUebernehmen(
  id: string,
  werte: { bauherr?: string | null; bauherr_art?: string | null; ansprechperson?: Ansprechperson | null },
): Promise<void> {
  const { error } = await db().rpc('grossprojekt_recherche_uebernehmen', {
    p_id: id,
    p_bauherr: werte.bauherr ?? '',
    p_bauherr_art: werte.bauherr_art ?? '',
    p_ansprechperson: (werte.ansprechperson ?? null) as never,
  })
  if (error) throw error
}

/** Vorgeschlagene Schritte als Aufgaben für mich anlegen; gibt die Zahl zurück. */
export async function schritteAlsAufgaben(
  id: string,
  schritte: NonNullable<Recherche['naechste_schritte']>,
): Promise<number> {
  const { data, error } = await db().rpc('grossprojekt_schritte_als_aufgaben', {
    p_id: id,
    p_schritte: schritte as never,
  })
  if (error) throw error
  return data
}

/** Stufe der Pipeline setzen («verloren» mit Grund, «vertrag» mit Datum und kWp). Nur bewilligte Grossprojekte. */
export async function stufeSetzen(
  id: string,
  stufe: Stufe,
  angaben: { grund?: string; datum?: string; kwp?: number } = {},
): Promise<void> {
  const { error } = await db().rpc('grossprojekt_stufe_setzen', { p_id: id, p_stufe: stufe, p_angaben: angaben })
  if (error) throw error
}

/** Akte pflegen: nur mitgeschickte Felder ändern sich. */
export async function akteSetzen(
  id: string,
  werte: {
    naechster_schritt?: string | null
    naechster_schritt_am?: string | null
    kontakte?: Kontakt[]
    unterlagen?: Record<string, string>
    rechnung?: RechnungWerte
    youdera?: YouderaStand
    besichtigung?: Besichtigung
  },
): Promise<void> {
  const { error } = await db().rpc('grossprojekt_akte_setzen', { p_id: id, p: werte as never })
  if (error) throw error
}

/** Eintrag im Verlauf von Hand: Notiz, Anruf, Mail oder Termin. */
export async function vermerken(id: string, art: string, text: string): Promise<void> {
  const { error } = await db().rpc('grossprojekt_vermerken', { p_id: id, p_art: art, p_text: text })
  if (error) throw error
}
