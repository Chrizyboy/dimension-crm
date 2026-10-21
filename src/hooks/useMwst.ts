import { useQuery } from '@tanstack/react-query'
import { rundeAuf5Rappen } from '@/lib/format'
import { supabase } from '@/services/supabase'

/** Standard, solange die Einstellung nicht geladen ist (Schweiz seit 2024). */
const MWST_STANDARD = 8.1

/**
 * MWST-Satz in Prozent aus den Einstellungen (einstellungen.mwst_satz), gemeinsam für Offerten,
 * Preise, Kalkulation und Werkverträge. Ändert der Bund den Satz, genügt eine Änderung dort.
 */
export function useMwst(): number {
  const abfrage = useQuery({
    queryKey: ['einstellungen', 'mwst_satz'],
    staleTime: 60 * 60_000,
    enabled: supabase !== null,
    queryFn: async () => {
      if (!supabase) return MWST_STANDARD
      const { data, error } = await supabase.rpc('mwst_satz')
      if (error) throw error
      return data
    },
  })
  return abfrage.data ?? MWST_STANDARD
}

/** Betrag inkl. MWST in Rappen, auf 5 Rappen gerundet. */
export function mitMwst(rappen: number, satz: number): number {
  return rundeAuf5Rappen(rappen * (1 + satz / 100))
}
