import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAuszahlungen, ladeProjekte, ladeSpesen } from '../services/spesen'

/** Spesen einer Person (personId) oder alle sichtbaren (null). */
export const useSpesen = (personId: string | null, aktiv = true) =>
  useQuery({
    queryKey: ['spesen', personId ?? 'alle'],
    enabled: supabase !== null && aktiv,
    queryFn: () => ladeSpesen(personId),
  })

/** Auszahlungsläufe (nur Buchhaltung). */
export const useAuszahlungen = (aktiv = true) =>
  useQuery({
    queryKey: ['spesen', 'auszahlungen'],
    enabled: supabase !== null && aktiv,
    queryFn: ladeAuszahlungen,
  })

/** Projekte für die Auswahl beim Erfassen. */
export const useSpesenProjekte = (aktiv = true) =>
  useQuery({
    queryKey: ['spesen', 'projekte'],
    enabled: supabase !== null && aktiv,
    staleTime: 5 * 60_000,
    queryFn: ladeProjekte,
  })

/** Nach einer Änderung alle Spesen-Listen neu laden. */
export function useSpesenNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['spesen'] })
}
