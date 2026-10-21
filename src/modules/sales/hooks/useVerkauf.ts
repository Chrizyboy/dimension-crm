import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { ladeAussendienst, ladeGeschaefte } from '../services/geschaefte'

/** Zwischenspeicher-Schlüssel aller Verkaufsdaten (Pipeline, Liste, Karte, Kalender). */
export const VERKAUF_SCHLUESSEL = ['verkauf'] as const

/** Alle Geschäfte der Pipeline. */
export function useGeschaefte() {
  return useQuery({ queryKey: [...VERKAUF_SCHLUESSEL, 'geschaefte'], queryFn: ladeGeschaefte })
}

/** Personen mit Kundenterminen; ändert sich selten. */
export function useAussendienst() {
  return useQuery({
    queryKey: [...VERKAUF_SCHLUESSEL, 'aussendienst'],
    queryFn: ladeAussendienst,
    staleTime: 10 * 60_000,
  })
}

/**
 * Führt eine Änderung aus und lädt danach Verkauf und Kunden neu: ein Lead ist auch Teil der Kundenakte.
 * Nicht auf das Neuladen warten, damit Dialoge sofort schliessen.
 */
export function useVerkaufAenderung<T, R>(ausfuehren: (eingabe: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ausfuehren,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VERKAUF_SCHLUESSEL })
      void client.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
    },
  })
}
