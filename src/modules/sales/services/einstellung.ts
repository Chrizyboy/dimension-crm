import { supabase } from '@/services/supabase'
import { mitStandard, VERKAUF_STANDARD, type VerkaufEinstellung } from '../lib/einstellung'

/** Einstellungen des Verkaufs (Uhr, Arbeitszeit, Richtpreis); fehlt die Zeile, gelten die Standardwerte. */
export async function ladeVerkaufEinstellung(): Promise<VerkaufEinstellung> {
  if (!supabase) return VERKAUF_STANDARD
  const { data, error } = await supabase.from('einstellungen').select('wert').eq('schluessel', 'verkauf').maybeSingle()
  if (error) throw error
  return mitStandard(data?.wert)
}
