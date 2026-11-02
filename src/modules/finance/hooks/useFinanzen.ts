import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAbschluss, ladeBuchungen, ladeMarge } from '../services/ablaeufe'
import { ladeFinanzen, ladeNachkalkulation, ladeProjekte } from '../services/finanzen'

const an = supabase !== null

/** Alle Daten der Liquidität (Zahlungen, Material, Fixkosten, Eingänge, Rechnungen, Kontostand). */
export const useFinanzen = (aktiv = true) =>
  useQuery({ queryKey: ['finanzen', 'daten'], enabled: an && aktiv, queryFn: ladeFinanzen })

/** Projekte für Auswahllisten. */
export const useProjekte = () =>
  useQuery({ queryKey: ['finanzen', 'projekte'], enabled: an, staleTime: 5 * 60_000, queryFn: ladeProjekte })

/** Nachkalkulation eines Projekts. */
export const useNachkalkulation = (projektId: string | null) =>
  useQuery({
    queryKey: ['finanzen', 'nachkalkulation', projektId],
    enabled: an && Boolean(projektId),
    queryFn: () => ladeNachkalkulation(projektId ?? ''),
  })

/** Nach einer Änderung alles der Finanzen neu laden (auch die Startseiten-Karte). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['finanzen'] })
}

/** Marge aller Projekte. */
export const useMarge = (aktiv = true) =>
  useQuery({ queryKey: ['finanzen', 'marge'], enabled: an && aktiv, queryFn: ladeMarge })

/** Stand der Abschluss-Liste eines Monats. */
export const useAbschluss = (monat: string) =>
  useQuery({ queryKey: ['finanzen', 'abschluss', monat], enabled: an, queryFn: () => ladeAbschluss(monat) })

/** Buchungen eines Kontos (erst beim Aufklappen). */
export const useBuchungen = (konto: string | null) =>
  useQuery({
    queryKey: ['finanzen', 'buchungen', konto],
    enabled: an && Boolean(konto),
    queryFn: () => ladeBuchungen(konto ?? ''),
  })
