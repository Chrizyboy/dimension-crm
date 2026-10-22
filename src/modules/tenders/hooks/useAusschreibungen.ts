import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as s from '../services/ausschreibungen'
import type { ListenFilter } from '../types'

const an = Boolean(supabase)

/** Dossiers einer Ansicht. */
export const useDossiers = (filter: ListenFilter | 'pruefen') =>
  useQuery({ queryKey: ['ausschreibungen', 'liste', filter], enabled: an, queryFn: () => s.ladeDossiers(filter) })

/** Ein Dossier mit Kontakten, Anschreiben und Verlauf. */
export function useDossier(id: string | null) {
  const aktiv = an && Boolean(id)
  const d = id ?? ''
  return {
    dossier: useQuery({
      queryKey: ['ausschreibungen', 'dossier', id],
      enabled: aktiv,
      queryFn: () => s.ladeDossier(d),
    }),
    kontakte: useQuery({
      queryKey: ['ausschreibungen', 'kontakte', id],
      enabled: aktiv,
      queryFn: () => s.ladeKontakte(d),
    }),
    anschreiben: useQuery({
      queryKey: ['ausschreibungen', 'anschreiben', 'dossier', id],
      enabled: aktiv,
      queryFn: () => s.ladeAnschreiben({ dossier: d }),
    }),
    verlauf: useQuery({
      queryKey: ['ausschreibungen', 'verlauf', id],
      enabled: aktiv,
      queryFn: () => s.ladeVerlauf(d),
    }),
  }
}

/** Anschreiben zum Bewilligen oder Senden. */
export const useAnschreiben = (status: 'entwurf' | 'bewilligt') =>
  useQuery({
    queryKey: ['ausschreibungen', 'anschreiben', status],
    enabled: an,
    queryFn: () => s.ladeAnschreiben({ status }),
  })

/** Zahlen für Reiter und Startseite (alle 5 Minuten neu). */
export const useTagesbericht = () =>
  useQuery({
    queryKey: ['ausschreibungen', 'tagesbericht'],
    enabled: an,
    queryFn: s.ladeTagesbericht,
    refetchInterval: 300_000,
  })

/** Nach einer Änderung alles zum Monitor neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['ausschreibungen'] })
}
