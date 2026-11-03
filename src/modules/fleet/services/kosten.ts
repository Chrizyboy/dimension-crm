import { supabase } from '@/services/supabase'
import type { Kosten } from '../types'

/** Kosten pro Fahrzeug und Gerätewert eines Jahres (nur mit Recht «finanzen», sonst Fehler 42501). */
export async function ladeKosten(jahr: number): Promise<Kosten> {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  const { data, error } = await supabase.rpc('fuhrpark_kosten', { p_jahr: jahr })
  if (error) throw error
  return data as unknown as Kosten
}
