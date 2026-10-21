import type { Auswahlwert } from '@/types/kontakt'
import { supabase } from './supabase'

/**
 * Werte einer Auswahlliste (z. B. «kundenstand», «kontaktart»), in der festgelegten Reihenfolge.
 * Texte, Farben und Reihenfolge pflegt die Administration; der Code kennt nur die Schlüssel.
 */
export async function ladeAuswahl(liste: string): Promise<Auswahlwert[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('auswahlwerte')
    .select('schluessel, text_de, text_fr, reihenfolge, farbe, eigenschaften')
    .eq('liste', liste)
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('reihenfolge')
  if (error) throw error
  return data.map((w) => ({
    ...w,
    eigenschaften:
      w.eigenschaften && typeof w.eigenschaften === 'object' ? (w.eigenschaften as Record<string, unknown>) : {},
  }))
}
