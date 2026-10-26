import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeSicherungen, ladeSicherungsStunden } from '../services/sicherung'

const SCHLUESSEL = ['einstellungen', 'sicherungen'] as const

/** Liste und Termine für den Reiter «Datensicherung»; solange eine läuft, alle 5 Sekunden neu. */
export function useSicherungen() {
  const an = Boolean(supabase)
  const liste = useQuery({
    queryKey: [...SCHLUESSEL, 'liste'],
    queryFn: ladeSicherungen,
    enabled: an,
    refetchInterval: (q) => (q.state.data?.some((s) => s.status === 'laeuft') ? 5000 : false),
  })
  const stunden = useQuery({ queryKey: [...SCHLUESSEL, 'stunden'], queryFn: ladeSicherungsStunden, enabled: an })
  return { liste, stunden }
}

/** Nach «Jetzt sichern» oder «Wiederherstellen» neu laden. */
export function useSicherungenNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: SCHLUESSEL })
}
