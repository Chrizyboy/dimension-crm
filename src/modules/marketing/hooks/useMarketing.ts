import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeKampagnen, ladeNewsletter, ladeVorlagen, ladeZielgruppe } from '../services/marketing'
import { ladePosts, ladeReferenzanlagen, ladeVerbindungen, socialStatus } from '../services/social'

const mitDb = supabase !== null

/** Zielgruppe (alle Kontakte mit Gruppe, Kanton, Anlage …). */
export const useZielgruppe = () =>
  useQuery({ queryKey: ['marketing', 'zielgruppe'], queryFn: ladeZielgruppe, enabled: mitDb, staleTime: 60_000 })

/** Letzte Aktionen. */
export const useKampagnen = () =>
  useQuery({ queryKey: ['marketing', 'kampagnen'], queryFn: ladeKampagnen, enabled: mitDb })

/** Vorlagen (Einstellung «marketing»). */
export const useVorlagen = () =>
  useQuery({ queryKey: ['einstellungen', 'marketing'], queryFn: ladeVorlagen, enabled: mitDb, staleTime: 10 * 60_000 })

/** Newsletter. */
export const useNewsletter = () =>
  useQuery({ queryKey: ['marketing', 'newsletter'], queryFn: ladeNewsletter, enabled: mitDb })

/** Social-Media-Posts. */
export const usePosts = () => useQuery({ queryKey: ['marketing', 'posts'], queryFn: ladePosts, enabled: mitDb })

/** Verbindungen zu Meta, LinkedIn, Canva. */
export const useVerbindungen = () =>
  useQuery({ queryKey: ['marketing', 'verbindungen'], queryFn: ladeVerbindungen, enabled: mitDb })

/** Server-Status (eingerichtet ja/nein); Fehler, wenn die Funktion nicht erreichbar ist. */
export const useSocialStatus = () =>
  useQuery({
    queryKey: ['marketing', 'social-status'],
    queryFn: socialStatus,
    enabled: mitDb,
    retry: false,
    staleTime: 5 * 60_000,
  })

/** Verbaute Anlagen als Vorlage für Posts. */
export const useReferenzanlagen = (an: boolean) =>
  useQuery({
    queryKey: ['marketing', 'anlagen'],
    queryFn: ladeReferenzanlagen,
    enabled: mitDb && an,
    staleTime: 10 * 60_000,
  })

/** Alles Marketing neu laden (nach Senden, Freigeben …). */
export function useMarketingNeuLaden() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['marketing'] }),
      qc.invalidateQueries({ queryKey: ['einstellungen', 'marketing'] }),
    ])
}
