import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as r from '../services/rechnungen'
import type { RechnungFilter } from '../types'

const an = Boolean(supabase)

/** Rechnungen nach Filter, auf Wunsch nur die eines Projekts. */
export const useRechnungen = (filter: RechnungFilter, projektId?: string) =>
  useQuery({
    queryKey: ['rechnungen', 'liste', filter, projektId ?? null],
    enabled: an,
    queryFn: () => r.ladeRechnungen(filter, projektId),
  })

/** Eine Rechnung mit allem für Akte und PDF. */
export const useRechnung = (id: string) =>
  useQuery({ queryKey: ['rechnungen', 'eine', id], enabled: an, queryFn: () => r.ladeRechnung(id) })

/** Was zu verrechnen ist: Tranchen ohne Rechnung und kostenpflichtige Rapporte. */
export const useZuVerrechnen = () =>
  useQuery({
    queryKey: ['rechnungen', 'verrechnen'],
    enabled: an,
    queryFn: async () => {
      const [tranchen, rapporte] = await Promise.all([r.ladeTranchen(), r.ladeOffeneRapporte()])
      return { tranchen, rapporte }
    },
  })

export const useFirmen = () => useQuery({ queryKey: ['rechnungen', 'firmen'], enabled: an, queryFn: r.ladeFirmen })

/** Nach einer Änderung Rechnungen und Projekte (Fahrplan «Anzahlung», «Schluss») neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['rechnungen'] }),
      qc.invalidateQueries({ queryKey: ['projekte'] }),
      qc.invalidateQueries({ queryKey: ['finanzen'] }),
      qc.invalidateQueries({ queryKey: ['einstellungen', 'finanzen'] }),
    ])
  }
}
