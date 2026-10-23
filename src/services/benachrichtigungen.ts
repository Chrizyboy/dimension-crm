import type { Benachrichtigung } from '@/stores/benachrichtigungen'
import { supabase } from '@/services/supabase'

/** So viele Meldungen vom Server zeigt die Glocke; ältere sind meist längst erledigt. */
const ANZAHL = 50

/**
 * Meldungen der Automationen für die angemeldete Person (RLS: nur die eigenen), neueste zuerst.
 * Ausgeblendete fehlen; sie bleiben in der Datenbank für das Protokoll.
 */
export async function ladeServerBenachrichtigungen(): Promise<Benachrichtigung[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('benachrichtigungen')
    .select('id, art, titel_de, titel_fr, text_de, text_fr, ziel, gelesen_am, erstellt_am')
    .is('ausgeblendet_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(ANZAHL)
  if (error) throw error
  return data.map((b) => ({
    id: b.id,
    art: b.art as Benachrichtigung['art'],
    titel: { de: b.titel_de, fr: b.titel_fr },
    ...(b.text_de || b.text_fr ? { text: { de: b.text_de ?? b.text_fr ?? '', fr: b.text_fr ?? b.text_de ?? '' } } : {}),
    zeit: b.erstellt_am,
    gelesen: b.gelesen_am !== null,
    ...(b.ziel ? { ziel: b.ziel } : {}),
    quelle: 'server' as const,
  }))
}

/** Markiert Meldungen als gelesen; ohne ids alle eigenen. */
export async function serverGelesen(ids?: string[]): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('benachrichtigungen_gelesen', ids ? { p_ids: ids } : {})
  if (error) throw error
}

/** Blendet eine Meldung aus (nicht löschen: sie gehört zum Protokoll des Laufs). */
export async function serverAusblenden(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('benachrichtigung_ausblenden', { p_id: id })
  if (error) throw error
}
