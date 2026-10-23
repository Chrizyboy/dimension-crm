import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { ladeAufgaben, ladePersonen } from '../services/aufgaben'
import type { AufgabenFilter } from '../types'

const mitDb = supabase !== null

/** Aufgaben nach Filter; jede Minute neu, damit Aufgaben aus Automationen ohne Neuladen erscheinen. */
export function useAufgaben(f: AufgabenFilter) {
  const ichId = useAnmeldung((z) => z.ich?.id ?? null)
  return useQuery({
    queryKey: ['aufgaben', f, ichId],
    queryFn: () => ladeAufgaben(f, ichId),
    enabled: mitDb,
    refetchInterval: 60_000,
  })
}

/** Personen für «Wer?». */
export const usePersonen = () =>
  useQuery({ queryKey: ['personen', 'aktiv'], queryFn: ladePersonen, enabled: mitDb, staleTime: 10 * 60_000 })
