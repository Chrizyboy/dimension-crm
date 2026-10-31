import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeGrossprojekte, ladeRegeln, ladeSucheStand, ladeVerlauf } from '../services/grossprojekte'

const mitDb = supabase !== null

/** Alle Grossprojekte (die Reiter filtern in der App, damit die Zahlen auf den Reitern stimmen). */
export const useGrossprojekte = (aktiv = true) =>
  useQuery({ queryKey: ['grossprojekte', 'liste'], enabled: mitDb && aktiv, queryFn: ladeGrossprojekte })

/** Verlauf eines Grossprojekts. */
export const useVerlauf = (id: string) =>
  useQuery({ queryKey: ['grossprojekte', 'verlauf', id], enabled: mitDb, queryFn: () => ladeVerlauf(id) })

/** Annahmen und Schwellen (selten geändert). */
export const useRegeln = () =>
  useQuery({ queryKey: ['grossprojekte', 'regeln'], enabled: mitDb, queryFn: ladeRegeln, staleTime: 10 * 60_000 })

/** Stand der Dachsuche. */
export const useSucheStand = () =>
  useQuery({ queryKey: ['grossprojekte', 'suche'], enabled: mitDb, queryFn: ladeSucheStand })

/** Nach einer Änderung alles im Bereich neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['grossprojekte'] })
}
