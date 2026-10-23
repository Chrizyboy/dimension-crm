import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeSpesen } from '../services/spesen'

/** Spesen einer Person (personId) oder alle sichtbaren (null). */
export const useSpesen = (personId: string | null, aktiv = true) =>
  useQuery({
    queryKey: ['spesen', personId ?? 'alle'],
    enabled: supabase !== null && aktiv,
    queryFn: () => ladeSpesen(personId),
  })

/** Nach einer Änderung alle Spesen-Listen neu laden. */
export function useSpesenNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['spesen'] })
}
