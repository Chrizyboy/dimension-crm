import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useDeferredValue } from 'react'
import { istLeadNummer, sucheLeadNummer } from '@/services/leadsuche'
import { supabase } from '@/services/supabase'
import type { Befehl } from './useBefehle'

/**
 * Leads als Treffer der Befehlspalette: «L12» tippen, Enter öffnet die Lead-Akte im Verkauf.
 * Erst ab einer Eingabe wie eine Lead-Nummer, damit die normale Suche nicht doppelt fragt.
 */
export function useLeadBefehle(suche: string, onGewaehlt?: () => void): { befehle: Befehl[]; laedt: boolean } {
  const navigate = useNavigate()
  const verzoegert = useDeferredValue(suche.trim())
  const abfrage = useQuery({
    queryKey: ['verkauf', 'nummer', verzoegert],
    queryFn: () => sucheLeadNummer(verzoegert),
    enabled: supabase !== null && istLeadNummer(verzoegert),
    staleTime: 30_000,
  })
  const befehle = (abfrage.data ?? []).map<Befehl>((l) => ({
    id: `lead-${l.id}`,
    titel: `${l.nummer} · ${l.name}`,
    untertitel: l.ort ?? '',
    gruppe: 'kontakte',
    icon: 'users',
    stichworte: [suche, l.nummer],
    ausfuehren: () => {
      void navigate({ to: '/sales', search: { lead: l.id } })
      onGewaehlt?.()
    },
  }))
  return { befehle, laedt: abfrage.isFetching }
}
