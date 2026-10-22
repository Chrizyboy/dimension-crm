import { supabase } from '@/services/supabase'
import type { Abwesenheit, Einsatz, EinsatzEntwurf, Person } from '../types'

/** Zeitplan: Einsätze, Personen und Abwesenheiten. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Einsätze, die den Zeitraum berühren. */
export async function ladeEinsaetze(von: string, bis: string): Promise<Einsatz[]> {
  const { data, error } = await db()
    .from('einsaetze')
    .select('id, projekt_id, art, von, bis, personen, subunternehmer_id, notiz')
    .is('geloescht_am', null)
    .lte('von', bis)
    .gte('bis', von)
    .order('von')
  if (error) throw error
  return data as Einsatz[]
}

/** Alle Einsätze eines Projekts (Planungsdialog). */
export async function ladeProjektEinsaetze(projektId: string): Promise<Einsatz[]> {
  const { data, error } = await db()
    .from('einsaetze')
    .select('id, projekt_id, art, von, bis, personen, subunternehmer_id, notiz')
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

/** Aktive Personen für Einsätze und Abwesenheiten. */
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
