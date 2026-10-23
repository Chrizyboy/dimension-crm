import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { KiEinstellungen, KiKosten, Schreibstil } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Kosten von–bis (Zürcher Tage). Die Administration sieht alle, sonst nur die eigenen (RLS). */
export async function ladeKosten(von: string, bis: string): Promise<KiKosten> {
  const { data, error } = await db().rpc('ki_kosten', { p_von: von, p_bis: bis })
  if (error) throw error
  return data as unknown as KiKosten
}

/** Einstellung «ki» lesen. */
export async function ladeEinstellungen(): Promise<KiEinstellungen> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'ki').single()
  if (error) throw error
  return data.wert as unknown as KiEinstellungen
}

/** Einstellung «ki» speichern (die Datenbank lässt nur die Administration). */
export async function speichereEinstellungen(e: KiEinstellungen): Promise<void> {
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: e as unknown as NonNullable<Json> })
    .eq('schluessel', 'ki')
  if (error) throw error
}

/** Eigener Schreibstil (null = noch nichts gelernt). */
export async function ladeStil(personId: string): Promise<Schreibstil | null> {
  const { data, error } = await db()
    .from('schreibstile')
    .select('id, regeln, beispiele, anzahl')
    .eq('person_id', personId)
    .is('geloescht_am', null)
    .maybeSingle()
  if (error) throw error
  return data as unknown as Schreibstil | null
}

/** Regeln von Hand ändern (die Person weiss es am besten). */
export async function speichereRegeln(id: string, regeln: string[]): Promise<void> {
  const { error } = await db().from('schreibstile').update({ regeln }).eq('id', id)
  if (error) throw error
}

/** Schreibstil zurücksetzen: in den Papierkorb (Regel 5), danach lernt die KI neu. */
export async function stilZuruecksetzen(id: string): Promise<void> {
  const { error } = await db().from('schreibstile').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
