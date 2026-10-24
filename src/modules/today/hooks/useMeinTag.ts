import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeMeinTag } from '../services/meinTag'

/** «Mein Tag» laden; alle 2 Minuten neu, damit neue Leads und Aufgaben ohne Neuladen erscheinen. */
export function useMeinTag() {
  return useQuery({
    queryKey: ['mein-tag'],
    queryFn: ladeMeinTag,
    enabled: supabase !== null,
    refetchInterval: 120_000,
  })
}
