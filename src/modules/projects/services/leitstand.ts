import { supabase } from '@/services/supabase'
import type { Akte, FahrplanSchritt, Nachkalkulation, Signale } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Signale aller laufenden Projekte (Material, Einsätze, Geld, Nachträge), als Karte nach Projekt. */
export async function ladeSignale(): Promise<Map<string, Signale>> {
  const { data, error } = await db().from('projekt_signale').select('*')
  if (error) throw error
  return new Map((data as unknown as Signale[]).map((s) => [s.projekt_id, s]))
}

/** Alles zu einem Projekt für die Akte in einer Abfrage. */
export async function ladeAkte(id: string): Promise<Akte> {
  const { data, error } = await db().rpc('projekt_akte', { p_id: id })
  if (error) throw error
  return data as unknown as Akte
}

/** Offene Schritte von Hand mit Frist bis zum Datum (für «Meine Woche»), überfällige eingeschlossen. */
export async function ladeFaelligeSchritte(bis: string): Promise<FahrplanSchritt[]> {
  const { data, error } = await db()
    .from('projekt_fahrplan')
    .select('*')
    .in('stand', ['offen', 'teilweise'])
    .eq('automatisch', false)
    .lte('frist', bis)
    .order('frist')
    .limit(500)
  if (error) throw error
  return data as unknown as FahrplanSchritt[]
}

/** Notiz, Anruf, Mail oder Besuch im Verlauf des Projekts festhalten. */
export async function vermerken(projektId: string, art: string, text: string): Promise<void> {
  const { error } = await db().rpc('projekt_vermerken', { p_projekt: projektId, p_art: art, p_text: text })
  if (error) throw error
}

/** Nachkalkulation (nur mit Recht Preise oder Finanzen): Soll und Ist von Material, Stunden und Erlös. */
export async function ladeNachkalkulation(id: string): Promise<Nachkalkulation> {
  const { data, error } = await db().rpc('nachkalkulation', { p_projekt: id })
  if (error) throw error
  return data as unknown as Nachkalkulation
}
