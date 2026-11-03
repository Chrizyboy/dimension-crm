import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import {
  ladeBetrieb,
  ladeFakten,
  ladePersonen,
  ladePipeline,
  ladeQuellenKosten,
  ladeKzEinstellungen,
  ladeQuellenNamen,
  ladeZusatz,
  setzeKzEinstellungen,
} from '../services/kennzahlen'
import { mitStandard } from '../lib/ziele'
import type { Fakt } from '../types'

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

/** Zusatz-Fakten eines Zeitraums. */
export const useZusatz = (von: string, bis: string, aktiv = true) =>
  useQuery({
    queryKey: ['kennzahlen', 'zusatz', von, bis],
    queryFn: () => ladeZusatz(von, bis),
    enabled: mitDb && aktiv,
    staleTime: 300_000,
  })

/**
 * Alle Zeilen eines Zeitraums (Grund- und Zusatz-Fakten zusammen). `aktiv` false lädt nichts (z. B. «Alles» ohne
 * Vergleich). Fehlen die Zusatz-Fakten (ältere Datenbank), bleiben die Grundzahlen sichtbar.
 */
export function useZeilen(von: string, bis: string, aktiv = true) {
  const grund = useQuery({
    queryKey: ['kennzahlen', 'fakten', von, bis],
    queryFn: () => ladeFakten(von, bis),
    enabled: mitDb && aktiv,
    staleTime: 300_000,
  })
  const zusatz = useZusatz(von, bis, aktiv)
  // Die IBN liefern beide Abfragen; die Zusatz-Zeile hat zusätzlich die kWp, darum gilt sie, sobald sie da ist.
  const grundZeilen = zusatz.data ? (grund.data ?? []).filter((f) => f.schluessel !== 'ibn') : grund.data
  const data: Fakt[] | undefined = grund.data ? [...(grundZeilen ?? []), ...(zusatz.data ?? [])] : undefined
  return {
    data,
    isLoading: grund.isLoading || (zusatz.isLoading && !zusatz.isError),
    isError: grund.isError,
    refetch: () => {
      void grund.refetch()
      void zusatz.refetch()
    },
  }
}

/** Einstellung «kennzahlen» mit Standardwerten. */
export const useKzEinstellungen = () =>
  useQuery({
    queryKey: ['kennzahlen', 'einstellungen'],
    queryFn: async () => mitStandard(await ladeKzEinstellungen()),
    enabled: mitDb,
    staleTime: 300_000,
  })

/** Ziele und Wahrscheinlichkeiten speichern; danach Einstellungen neu laden. */
export function useKzEinstellungenSpeichern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setzeKzEinstellungen,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kennzahlen', 'einstellungen'] }),
  })
}
