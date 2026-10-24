import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import {
  ladeBetrieb,
  ladeFakten,
  ladePersonen,
  ladePipeline,
  ladeQuellenKosten,
  ladeQuellenNamen,
} from '../services/kennzahlen'

const mitDb = supabase !== null

/** Detail-Zeilen eines Zeitraums; 5 Minuten frisch, Zahlen ändern sich nicht im Sekundentakt. */
export const useFakten = (von: string, bis: string) =>
  useQuery({
    queryKey: ['kennzahlen', 'fakten', von, bis],
    queryFn: () => ladeFakten(von, bis),
    enabled: mitDb,
    staleTime: 300_000,
  })

/** Auftragsbestand, Auslastung, Marge. */
export const useBetrieb = (von: string, bis: string) =>
  useQuery({
    queryKey: ['kennzahlen', 'betrieb', von, bis],
    queryFn: () => ladeBetrieb(von, bis),
    enabled: mitDb,
    staleTime: 300_000,
  })

/** Kosten pro Lead je Quelle. */
export const useQuellenKosten = () =>
  useQuery({ queryKey: ['kennzahlen', 'kosten'], queryFn: ladeQuellenKosten, enabled: mitDb })

/** Offene Geschäfte für die Pipeline. */
export const usePipeline = () =>
  useQuery({ queryKey: ['kennzahlen', 'pipeline'], queryFn: ladePipeline, enabled: mitDb, staleTime: 300_000 })

/** Personen (Namen). */
export const usePersonenNamen = () =>
  useQuery({ queryKey: ['kennzahlen', 'personen'], queryFn: ladePersonen, enabled: mitDb, staleTime: 600_000 })

/** Namen der Lead-Quellen. */
export const useQuellenNamen = () =>
  useQuery({ queryKey: ['kennzahlen', 'quellen'], queryFn: ladeQuellenNamen, enabled: mitDb, staleTime: 600_000 })
