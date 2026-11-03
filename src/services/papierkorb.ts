import type { Database } from '@/types/datenbank'
import { supabase } from './supabase'

/** Ein Eintrag im Papierkorb, egal aus welchem Bereich. */
export type PapierkorbEintrag = Database['public']['Functions']['papierkorb_liste']['Returns'][number]

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/**
 * Legt einen Datensatz in den Papierkorb (nie hart löschen, CLAUDE.md Regel 5).
 * Gemeinsam für alle Bereiche: Ob die Person darf und ob der Datensatz noch weg darf
 * (z. B. gestellte Rechnung → stornieren), entscheidet die Datenbank (`papierkorb_legen`).
 */
export async function legeInPapierkorb(tabelle: string, id: string): Promise<void> {
  const { error } = await db().rpc('papierkorb_legen', { p_tabelle: tabelle, p_id: id })
  if (error) throw error
}

/** Holt einen Datensatz aus dem Papierkorb zurück. */
export async function holeAusPapierkorb(tabelle: string, id: string): Promise<void> {
  const { error } = await db().rpc('papierkorb_zurueckholen', { p_tabelle: tabelle, p_id: id })
  if (error) throw error
}

/** Papierkorb: Administration alles, sonst nur selbst Weggelegtes, neueste zuerst. */
export async function ladePapierkorb(): Promise<PapierkorbEintrag[]> {
  const { data, error } = await db().rpc('papierkorb_liste', { p_grenze: 300 })
  if (error) throw error
  return data
}
