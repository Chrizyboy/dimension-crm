import { supabase } from '@/services/supabase'
import type { AusweisStand } from '../lib/ausweise'
import type { Abwesenheit, Einsatz, EinsatzEntwurf, Person, ServiceTermin } from '../types'

/** Zeitplan: Einsätze, Personen und Abwesenheiten. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Einsätze, die den Zeitraum berühren. */
export async function ladeEinsaetze(von: string, bis: string): Promise<Einsatz[]> {
  const { data, error } = await db()
    .from('einsaetze')
    .select('id, projekt_id, art, von, bis, personen, subunternehmer_id, notiz, taetigkeiten')
    .is('geloescht_am', null)
    .lte('von', bis)
    .gte('bis', von)
    .order('von')
  if (error) throw error
  return data as Einsatz[]
}

/** Service-Termine im Zeitraum (geplant in «Service & Garantie»), für Team-Sicht und Handy. */
export async function ladeServiceTermine(von: string, bis: string): Promise<ServiceTermin[]> {
  const { data, error } = await db()
    .from('service_termine')
    .select('id, nummer, titel, datum, termin_am, dauer_minuten, personen, kunde, ort, auswirkung')
    .gte('datum', von)
    .lte('datum', bis)
    .order('termin_am')
  if (error) throw error
  return data as ServiceTermin[]
}

/** Alle Einsätze eines Projekts (Planungsdialog). */
export async function ladeProjektEinsaetze(projektId: string): Promise<Einsatz[]> {
  const { data, error } = await db()
    .from('einsaetze')
    .select('id, projekt_id, art, von, bis, personen, subunternehmer_id, notiz, taetigkeiten')
    .eq('projekt_id', projektId)
    .is('geloescht_am', null)
    .order('von')
  if (error) throw error
  return data as Einsatz[]
}

/** Zeitplan eines Projekts speichern: Einsätze, Baustellen-Status, Material. */
export async function zeitplanSpeichern(
  projektId: string,
  p: { einsaetze: EinsatzEntwurf[]; bau_status: string; material_status: string },
): Promise<void> {
  const { error } = await db().rpc('projekt_zeitplan_speichern', { p_id: projektId, p: p as never })
  if (error) throw error
}

/** Ausweise aller Personen (nur Art und «gültig bis») für die Warnung «Pflicht-Ausweis fehlt». */
export async function ladeAusweisStand(): Promise<AusweisStand[]> {
  const { data, error } = await db()
    .from('qualifikationen')
    .select('person_id, art, gueltig_bis')
    .is('geloescht_am', null)
  if (error) throw error
  return data
}

/** Aktive Personen für Einsätze und Abwesenheiten. */
/** IDs der Mitarbeitenden, deren direkte Vorgesetzte die angemeldete Person ist (Personal-Akte). */
export async function ladeMeineMitarbeitenden(): Promise<string[]> {
  const { data, error } = await db().rpc('meine_mitarbeitenden')
  if (error) throw error
  return data
}

export async function ladePersonen(): Promise<Person[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, kuerzel, name, rolle')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Abwesenheiten (CRM und Outlook), die den Zeitraum berühren. */
export async function ladeAbwesenheiten(von: string, bis: string): Promise<Abwesenheit[]> {
  const { data, error } = await db().from('abwesenheiten_alle').select('*').lte('von', bis).gte('bis', von).order('von')
  if (error) throw error
  return data as Abwesenheit[]
}

/** Abwesenheit erfassen. */
export async function abwesenheitAnlegen(a: Omit<Abwesenheit, 'id' | 'quelle'>): Promise<void> {
  const { error } = await db()
    .from('abwesenheiten')
    .insert({ ...a, quelle: 'crm' })
  if (error) throw error
}

/** Abwesenheit in den Papierkorb (nur CRM-Einträge; Outlook bleibt Sache von Outlook). */
export async function abwesenheitEntfernen(id: string): Promise<void> {
  const { error } = await db().from('abwesenheiten').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/**
 * Einen Einsatz direkt im Zeitplan ändern (Ziehen): lädt alle Einsätze des Projekts, ersetzt den einen und
 * speichert über `projekt_zeitplan_speichern`. Bau-Status bleibt, Material wird nicht mitgeschickt (bleibt).
 */
export async function einsatzAendern(
  projektId: string,
  bauStatus: string,
  einsatzId: string,
  aendern: (e: Einsatz) => Einsatz,
): Promise<void> {
  const alle = await ladeProjektEinsaetze(projektId)
  const einsaetze = alle.map((e) => {
    const x = e.id === einsatzId ? aendern(e) : e
    return {
      id: x.id,
      art: x.art,
      von: x.von,
      bis: x.bis,
      personen: x.personen,
      subunternehmer_id: x.subunternehmer_id,
      notiz: x.notiz,
      taetigkeiten: x.taetigkeiten,
    }
  })
  const { error } = await db().rpc('projekt_zeitplan_speichern', {
    p_id: projektId,
    p: { einsaetze, bau_status: bauStatus } as never,
  })
  if (error) throw error
}
