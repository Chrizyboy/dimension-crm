import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as s from '../services/vertraege'
import type { Filter } from '../types'

const an = Boolean(supabase)

/** Verträge nach Filter; `bis` = heute + 30 Tage, `rechnungBis` = heute + Vorlauf der Jahresrechnung. */
export const useVertraege = (filter: Filter, bis: string, rechnungBis: string) =>
  useQuery({
    queryKey: ['wartung', 'liste', filter, bis, rechnungBis],
    enabled: an,
    queryFn: () => s.ladeVertraege(filter, bis, rechnungBis),
  })

/** Ein Vertrag. */
export const useVertrag = (id: string) =>
  useQuery({ queryKey: ['wartung', 'vertrag', id], enabled: an, queryFn: () => s.ladeVertrag(id) })

/** Pakete, Preise und Bedingungen der Website. */
export const useKatalog = () =>
  useQuery({ queryKey: ['wartung', 'katalog'], enabled: an, queryFn: s.ladeKatalog, staleTime: 30 * 60_000 })

/** Projekte eines Kunden. */
export const useKundenProjekte = (kontaktId: string | null) =>
  useQuery({
    queryKey: ['wartung', 'projekte', kontaktId],
    enabled: an && Boolean(kontaktId),
    queryFn: () => s.ladeKundenProjekte(kontaktId ?? ''),
  })

/** Anlagen eines Kunden zum Vorfüllen. */
export const useKundenAnlagen = (kontaktId: string | null) =>
  useQuery({
    queryKey: ['wartung', 'anlagen', kontaktId],
    enabled: an && Boolean(kontaktId),
    queryFn: () => s.ladeKundenAnlagen(kontaktId ?? ''),
  })

/** Rechnungen eines Vertrags. */
export const useVertragRechnungen = (id: string) =>
  useQuery({ queryKey: ['wartung', 'rechnungen', id], enabled: an, queryFn: () => s.ladeVertragRechnungen(id) })

/** Nach einer Änderung alles zur Wartung neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['wartung'] })
}
