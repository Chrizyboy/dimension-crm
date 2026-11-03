import { supabase } from '@/services/supabase'

/**
 * Gültige Kurse und Ausweise einer Person (Schlüssel der Auswahlliste «qualifikation»). Damit warnt «Übergeben»,
 * wenn jemand ein Fahrzeug ohne den nötigen Führerausweis bekommt (z. B. Anhänger ohne BE).
 */
export async function gueltigeAusweise(person: string, heute: string): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('qualifikationen')
    .select('art, gueltig_bis')
    .eq('person_id', person)
    .is('geloescht_am', null)
  if (error) throw error
  return data.filter((q) => q.gueltig_bis === null || q.gueltig_bis >= heute).map((q) => q.art)
}

/** Fehlt der Person der Ausweis? Führerausweis BE schliesst B ein, C1 ebenfalls. */
export function ausweisFehlt(noetig: string | null, vorhanden: string[]): boolean {
  if (!noetig) return false
  const deckt: Record<string, string[]> = {
    fuehrerausweis_b: ['fuehrerausweis_b', 'fuehrerausweis_be', 'fuehrerausweis_c1'],
  }
  return !(deckt[noetig] ?? [noetig]).some((a) => vorhanden.includes(a))
}
