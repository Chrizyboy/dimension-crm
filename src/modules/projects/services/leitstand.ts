import { supabase } from '@/services/supabase'
import type { Akte, FahrplanSchritt, Mangel, Nachkalkulation, Signale } from '../types'

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

/** Mangel oder Restarbeit anlegen oder ändern; die ID kommt aus der App, damit ein zweites Senden nichts verdoppelt. */
export async function mangelSpeichern(
  id: string,
  projektId: string,
  m: Pick<Mangel, 'art' | 'text' | 'ort' | 'frist' | 'verantwortlich_id'>,
): Promise<void> {
  const { error } = await db().rpc('projekt_mangel_speichern', { p_id: id, p_projekt: projektId, p: m })
  if (error) throw error
}

/** Mangel erledigen (mit Notiz) oder wieder öffnen. */
export async function mangelErledigen(id: string, erledigt: boolean, notiz?: string): Promise<void> {
  const { error } = await db().rpc('projekt_mangel_erledigen', {
    p_id: id,
    p_erledigt: erledigt,
    ...(notiz ? { p_notiz: notiz } : {}),
  })
  if (error) throw error
}

/** Kontakt mit Rolle als Beteiligten zum Projekt hinzufügen. */
export async function beteiligtSetzen(projektId: string, kontaktId: string, rolle: string): Promise<void> {
  const { error } = await db().rpc('projekt_beteiligt_setzen', {
    p_projekt: projektId,
    p_kontakt: kontaktId,
    p_rolle: rolle,
  })
  if (error) throw error
}

/** Beteiligten vom Projekt entfernen (Papierkorb). */
export async function beteiligtEntfernen(id: string): Promise<void> {
  const { error } = await db().rpc('projekt_beteiligt_entfernen', { p_id: id })
  if (error) throw error
}
