import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAusgang } from '../services/ausgang'
import type { AusgangFilter } from '../types'

/** Einträge des Ausgangskorbs; lädt alle 15 Sekunden neu, solange noch etwas unterwegs ist. */
export function useAusgang(filter: AusgangFilter) {
  return useQuery({
    queryKey: ['ausgang', filter],
    enabled: Boolean(supabase),
    queryFn: () => ladeAusgang(filter),
    refetchInterval: (q) =>
      q.state.data?.some((e) => e.status === 'freigegeben' || e.status === 'wird_gesendet') ? 15_000 : false,
  })
}

/** Liste nach einer Änderung neu laden. */
export function useAusgangNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['ausgang'] })
}
