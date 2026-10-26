import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAkte, ladeAusweise, ladeTeam } from '../services/personal'

const mitDb = supabase !== null

/** Aktive Personen mit Rolle. */
export const useTeam = () =>
  useQuery({ queryKey: ['team', 'personen'], enabled: mitDb, queryFn: ladeTeam, staleTime: 5 * 60_000 })

/** Alle Ausweise. */
export const useAusweise = () => useQuery({ queryKey: ['team', 'ausweise'], enabled: mitDb, queryFn: ladeAusweise })

/** Personal-Akte einer Person (nur Administration und die Person selbst bekommen Daten). */
export const useAkte = (personId: string, aktiv: boolean) =>
  useQuery({ queryKey: ['team', 'akte', personId], enabled: mitDb && aktiv, queryFn: () => ladeAkte(personId) })

/** Nach einer Änderung alles neu laden; auch die Fristen unter «Fahrzeuge & Geräte» (Ausweise). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['team'] }), qc.invalidateQueries({ queryKey: ['fuhrpark'] })])
}
