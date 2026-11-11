import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeTage, ladeZeiten, ladeZeiterfassung } from '../services/zeit'

const mitDb = supabase !== null

/** Übersicht des Bereichs für Jahr und Woche (jede Minute frisch, damit «läuft seit» stimmt). */
export const useZeiterfassung = (jahr: number, montag: string) =>
  useQuery({
    queryKey: ['zeit', 'uebersicht', jahr, montag],
    enabled: mitDb,
    queryFn: () => ladeZeiterfassung(jahr, montag),
    refetchInterval: 60_000,
  })

/** Tage einer Person im Zeitraum. */
export const useTage = (person: string | null, von: string, bis: string) =>
  useQuery({
    queryKey: ['zeit', 'tage', person, von, bis],
    enabled: mitDb && Boolean(person),
    queryFn: () => ladeTage(person ?? '', von, bis),
  })

/** Gestempelte Zeiten einer Person im Zeitraum. */
export const useZeiten = (person: string | null, von: string, bis: string) =>
  useQuery({
    queryKey: ['zeit', 'zeiten', person, von, bis],
    enabled: mitDb && Boolean(person),
    queryFn: () => ladeZeiten(person ?? '', von, bis),
  })

/** Nach einer Änderung alles der Zeiterfassung neu laden (auch Baustelle und Planung, die dieselben Daten zeigen). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['zeit'] }),
      qc.invalidateQueries({ queryKey: ['baustelle'] }),
      qc.invalidateQueries({ queryKey: ['projekte'] }),
    ])
}
