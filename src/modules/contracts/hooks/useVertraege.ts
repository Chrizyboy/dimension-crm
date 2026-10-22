import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as s from '../services/vertraege'
import type { Filter } from '../types'

const an = Boolean(supabase)

/** Verträge nach Filter; `bis` ist das Datum für «fällig» (heute + 30 Tage). */
export const useVertraege = (filter: Filter, bis: string) =>
  useQuery({ queryKey: ['wartung', 'liste', filter, bis], enabled: an, queryFn: () => s.ladeVertraege(filter, bis) })

/** Ein Vertrag. */
export const useVertrag = (id: string) =>
  useQuery({ queryKey: ['wartung', 'vertrag', id], enabled: an, queryFn: () => s.ladeVertrag(id) })

/** Leistungskatalog. */
export const useKatalog = () =>
  useQuery({ queryKey: ['wartung', 'katalog'], enabled: an, queryFn: s.ladeKatalog, staleTime: 30 * 60_000 })

/** Projekte eines Kunden. */
export const useKundenProjekte = (kontaktId: string | null) =>
  useQuery({
    queryKey: ['wartung', 'projekte', kontaktId],
    enabled: an && Boolean(kontaktId),
    queryFn: () => s.ladeKundenProjekte(kontaktId ?? ''),
  })

/** Nach einer Änderung alles zur Wartung neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['wartung'] })
}
