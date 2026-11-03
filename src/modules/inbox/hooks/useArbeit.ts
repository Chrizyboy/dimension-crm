import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import {
  ladeAbsenderRegeln,
  ladeAnhaenge,
  ladeNotizen,
  ladeOffeneBestellungen,
  ladeTeam,
  ladeVerlauf,
} from '../services/arbeit'

const mitDb = supabase !== null

/** Unterhaltung aus Outlook (einmal pro Mail, nur mit Konversation). */
export const useVerlauf = (id: string, aktiv: boolean) =>
  useQuery({
    queryKey: ['posteingang', 'text', 'verlauf', id],
    enabled: mitDb && aktiv,
    queryFn: () => ladeVerlauf(id),
    retry: false,
    staleTime: 5 * 60_000,
  })

/** Anhänge aus Outlook (nur wenn die Mail welche hat). */
export const useAnhaenge = (id: string, aktiv: boolean) =>
  useQuery({
    queryKey: ['posteingang', 'text', 'anhaenge', id],
    enabled: mitDb && aktiv,
    queryFn: () => ladeAnhaenge(id),
    retry: false,
    staleTime: Infinity,
  })

/** Interne Notizen einer Mail. */
export const useNotizen = (id: string) =>
  useQuery({ queryKey: ['posteingang', 'notizen', id], enabled: mitDb, queryFn: () => ladeNotizen(id) })

/** Absender-Regeln. */
export const useAbsenderRegeln = () =>
  useQuery({ queryKey: ['posteingang', 'absender'], enabled: mitDb, queryFn: ladeAbsenderRegeln })

/** Team-Übersicht; jede Minute neu wie die Liste. */
export const useTeam = (aktiv = true) =>
  useQuery({
    queryKey: ['posteingang', 'team'],
    enabled: mitDb && aktiv,
    queryFn: ladeTeam,
    refetchInterval: 60_000,
  })

/** Bestellungen, die noch kommen. */
export const useOffeneBestellungen = (aktiv: boolean) =>
  useQuery({ queryKey: ['posteingang', 'bestellungen'], enabled: mitDb && aktiv, queryFn: ladeOffeneBestellungen })
