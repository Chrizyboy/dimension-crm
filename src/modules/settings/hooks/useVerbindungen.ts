import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeIntegrationen, ladeMsPersonen, ladeProtokoll, ladeZeitplan } from '../services/verbindungen'

const SCHLUESSEL = ['einstellungen', 'verbindungen'] as const

/** Alles für den Reiter «Verbindungen». */
export function useVerbindungen() {
  const an = Boolean(supabase)
  return {
    dienste: useQuery({ queryKey: [...SCHLUESSEL, 'dienste'], queryFn: ladeIntegrationen, enabled: an }),
    personen: useQuery({ queryKey: [...SCHLUESSEL, 'personen'], queryFn: ladeMsPersonen, enabled: an }),
    zeitplan: useQuery({ queryKey: [...SCHLUESSEL, 'zeitplan'], queryFn: ladeZeitplan, enabled: an }),
    protokoll: useQuery({ queryKey: [...SCHLUESSEL, 'protokoll'], queryFn: ladeProtokoll, enabled: an }),
  }
}

/** Nach einem Test oder einer Änderung neu laden. */
export function useVerbindungenNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: SCHLUESSEL })
}
