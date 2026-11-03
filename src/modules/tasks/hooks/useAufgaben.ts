import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { ladeAufgabe, ladeAufgaben, ladeKommentare, ladePersonen, ladeTeam } from '../services/aufgaben'
import type { Ansicht } from '../types'

const mitDb = supabase !== null

/** Aufgaben einer Ansicht; jede Minute neu, damit Aufgaben aus Automationen ohne Neuladen erscheinen. */
export function useAufgaben(ansicht: Ansicht, person?: string | null) {
  const ichId = useAnmeldung((z) => z.ich?.id ?? null)
  return useQuery({
    queryKey: ['aufgaben', ansicht, person ?? null, ichId],
    queryFn: () => ladeAufgaben(ansicht, ichId, person),
    enabled: mitDb && ansicht !== 'team',
    refetchInterval: 60_000,
  })
}

/** Eine Aufgabe für die Akte. */
export const useAufgabe = (id: string | null) =>
  useQuery({
    queryKey: ['aufgaben', 'eine', id],
    queryFn: () => ladeAufgabe(id ?? ''),
    enabled: mitDb && !!id,
  })

/** Kommentare einer Aufgabe. */
export const useKommentare = (id: string | null) =>
  useQuery({
    queryKey: ['aufgaben', 'kommentare', id],
    queryFn: () => ladeKommentare(id ?? ''),
    enabled: mitDb && !!id,
  })

/** Team-Sicht. */
export const useTeam = (aktiv: boolean) =>
  useQuery({ queryKey: ['aufgaben', 'team'], queryFn: ladeTeam, enabled: mitDb && aktiv, refetchInterval: 60_000 })

/** Personen für «Für wen». */
export const usePersonen = () =>
  useQuery({ queryKey: ['personen', 'aktiv'], queryFn: ladePersonen, enabled: mitDb, staleTime: 10 * 60_000 })

/** Nach jeder Änderung: Aufgaben und «Mein Tag» neu laden. */
export function useNeuLaden() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['aufgaben'] })
    void client.invalidateQueries({ queryKey: ['mein-tag'] })
  }
}
