import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'

/** Spesen-Kategorie mit Text in beiden Sprachen; gespeichert wird der Schlüssel. */
export interface SpesenKategorie {
  schluessel: string
  de: string
  fr: string
}

/** Einstellung «finanzen» (Daten, nicht Code; ändern nur mit Recht «finanzen»). */
export interface FinanzEinstellungen {
  service_stundensatz_rappen: number
  intern_stundensatz_rappen: number
  mahnfrist_tage: number
  buchhaltung_email: string | null
  spesen_kategorien: SpesenKategorie[]
}

const STANDARD: FinanzEinstellungen = {
  service_stundensatz_rappen: 12000,
  intern_stundensatz_rappen: 6500,
  mahnfrist_tage: 10,
  buchhaltung_email: null,
  spesen_kategorien: [],
}

/**
 * Einstellungen der Finanzen, gemeinsam für Rechnungen (Mahnfrist, Stundensatz), Spesen (Kategorien,
 * Mail an die Buchhaltung) und Finanzen (interner Stundensatz der Nachkalkulation).
 */
export function useFinanzEinstellungen(): FinanzEinstellungen {
  const abfrage = useQuery({
    queryKey: ['einstellungen', 'finanzen'],
    staleTime: 10 * 60_000,
    enabled: supabase !== null,
    queryFn: async () => {
      if (!supabase) return STANDARD
      const { data, error } = await supabase
        .from('einstellungen')
        .select('wert')
        .eq('schluessel', 'finanzen')
        .maybeSingle()
      if (error) throw error
      return { ...STANDARD, ...((data?.wert ?? {}) as Partial<FinanzEinstellungen>) }
    },
  })
  return abfrage.data ?? STANDARD
}

/** Einstellungen der Finanzen speichern (die Datenbank prüft das Recht). */
export async function finanzEinstellungenSpeichern(wert: FinanzEinstellungen): Promise<void> {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  const { error } = await supabase
    .from('einstellungen')
    .update({ wert: wert as never })
    .eq('schluessel', 'finanzen')
  if (error) throw error
}
