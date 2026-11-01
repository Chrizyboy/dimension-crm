import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as s from '../services/service'
import type { FallFilter } from '../types'

const an = Boolean(supabase)

/** Service-Fälle nach Filter. */
export const useFaelle = (filter: FallFilter, ichId?: string | null) =>
  useQuery({
    queryKey: ['service', 'faelle', filter, filter === 'meine' ? ichId : null],
    enabled: an,
    queryFn: () => s.ladeFaelle(filter, ichId),
  })

/** Ein Fall mit Anhängen. */
export function useFall(id: string) {
  return {
    fall: useQuery({ queryKey: ['service', 'fall', id], enabled: an, queryFn: () => s.ladeFall(id) }),
    anhaenge: useQuery({ queryKey: ['service', 'anhaenge', id], enabled: an, queryFn: () => s.ladeAnhaenge(id) }),
  }
}

/** Alle Anlagen. */
export const useAnlagen = () => useQuery({ queryKey: ['service', 'anlagen'], enabled: an, queryFn: s.ladeAnlagen })

/** Anlagen eines Kunden. */
export const useKundenAnlagen = (kontaktId: string | null) =>
  useQuery({
    queryKey: ['service', 'anlagen', 'kunde', kontaktId],
    enabled: an && Boolean(kontaktId),
    queryFn: () => s.ladeKundenAnlagen(kontaktId ?? ''),
  })

/** Aktive Personen. */
/** Eine Anlage (null = keine gewählt). */
export const useAnlage = (id: string | null) =>
  useQuery({ queryKey: ['service', 'anlage', id], enabled: an && !!id, queryFn: () => s.ladeAnlage(id ?? '') })

export const usePersonen = () =>
  useQuery({ queryKey: ['service', 'personen'], enabled: an, queryFn: s.ladePersonen, staleTime: 10 * 60_000 })

/** Nach einer Änderung alles zum Service neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['service'] })
}
