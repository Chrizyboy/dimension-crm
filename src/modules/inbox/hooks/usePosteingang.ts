import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAuswertung, ladeMails, ladePersonen, ladeRegeln, ladeText } from '../services/posteingang'

const mitDb = supabase !== null

/** Alle sichtbaren Mails; jede Minute neu, damit Fristen und neue Mails ohne Klick erscheinen. */
export const useMails = (aktiv = true) =>
  useQuery({
    queryKey: ['posteingang', 'liste'],
    enabled: mitDb && aktiv,
    queryFn: ladeMails,
    refetchInterval: 60_000,
  })

/** Volltext einer Mail aus Outlook (einmal pro Mail). */
export const useText = (id: string) =>
  useQuery({
    queryKey: ['posteingang', 'text', id],
    enabled: mitDb,
    queryFn: () => ladeText(id),
    retry: false,
    staleTime: Infinity,
  })

/** Auswertung der Reaktionszeit. */
export const useAuswertung = () =>
  useQuery({ queryKey: ['posteingang', 'auswertung'], enabled: mitDb, queryFn: () => ladeAuswertung(8) })

/** Einstellung «posteingang». */
export const useRegeln = () =>
  useQuery({ queryKey: ['posteingang', 'regeln'], enabled: mitDb, queryFn: ladeRegeln, staleTime: 10 * 60_000 })

/** Aktive Personen. */
export const usePersonen = () =>
  useQuery({ queryKey: ['posteingang', 'personen'], enabled: mitDb, queryFn: ladePersonen, staleTime: 10 * 60_000 })

/** Nach einer Änderung alles im Bereich neu laden (ausser dem Volltext). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['posteingang'], predicate: (q) => q.queryKey[1] !== 'text' })
}
