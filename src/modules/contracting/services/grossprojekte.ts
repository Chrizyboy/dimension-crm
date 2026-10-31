import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { Grossprojekt, GrossprojektRegeln, Vermerk } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, nummer, titel, beschreibung, quelle, quell_url, ausschreibung_id, strasse, plz, gemeinde, kanton, parzelle, sprache, fahrzeit_min, lage_e, lage_n, bauherr, bauherr_art, nutzung, geschuetzt, heizungsersatz, dachflaeche_m2, dach_klasse, stromertrag_kwh, heizung, heizung_jahr, waermeleistung_kw, wohnungen, baujahr, egid, angereichert_am, anreicherung, punkte, punkte_details, art, ausschluss, schaetzung, stand, wiedervorlage_am, grund, entschieden_am, verkaufschance_id, notiz, erstellt_am, standort:standorte(name), entschieder:personen!grossprojekte_entschieden_von_fkey(name)'

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
    .select('id, zeitpunkt, text, person:personen(name)')
    .eq('grossprojekt_id', id)
    .is('geloescht_am', null)
    .order('zeitpunkt', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as unknown as (Omit<Vermerk, 'person'> & { person: { name: string } | null })[]).map((v) => ({
    ...v,
    person: v.person?.name ?? null,
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
export async function speichereAnnahmen(werte: Pick<GrossprojektRegeln, 'annahmen' | 'melden_ab'>): Promise<void> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'grossprojekte').single()
  if (error) throw error
  const alt = data.wert as GrossprojektRegeln
  const neu = { ...alt, melden_ab: werte.melden_ab, annahmen: { ...alt.annahmen, ...werte.annahmen } }
  const r = await db().from('einstellungen').update({ wert: neu }).eq('schluessel', 'grossprojekte')
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
