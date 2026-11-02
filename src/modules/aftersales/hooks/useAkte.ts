import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAkte, ladeAnlageAkte, ladeLeitstandzahlen } from '../services/akte'

const an = Boolean(supabase)

/** Alles rund um einen Fall (Kunde, Anlage, Rapporte, Rechnungen, Mails). */
export const useAkte = (id: string) =>
  useQuery({ queryKey: ['service', 'akte', id], enabled: an, queryFn: () => ladeAkte(id) })

/** Zahlen des Leitstands (RMA offen, zu verrechnen). */
export const useLeitstandzahlen = () =>
  useQuery({ queryKey: ['service', 'leitstand'], enabled: an, queryFn: ladeLeitstandzahlen, staleTime: 60_000 })

/** Alles zu einer Anlage (Anlage-Akte). */
export const useAnlageAkte = (id: string) =>
  useQuery({ queryKey: ['service', 'anlage', id], enabled: an, queryFn: () => ladeAnlageAkte(id) })
