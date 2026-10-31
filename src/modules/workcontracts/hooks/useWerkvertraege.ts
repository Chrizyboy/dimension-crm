import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ladeAuftragsOfferte, ladeEinstellung, ladeStandorte, ladeVertraege } from '../services/werkvertraege'

/** Zwischenspeicher-Schlüssel der Werkverträge. */
export const VERTRAG_SCHLUESSEL = ['werkvertraege'] as const

/** Alle Werkverträge. */
export function useVertraege() {
  return useQuery({ queryKey: [...VERTRAG_SCHLUESSEL, 'liste'], queryFn: ladeVertraege })
}

/** Die Offerte, zu der ein Auftrag erstellt wird. */
export function useAuftragsOfferte(id: string | null) {
  return useQuery({
    queryKey: [...VERTRAG_SCHLUESSEL, 'offerte', id],
    queryFn: () => (id ? ladeAuftragsOfferte(id) : null),
    enabled: id !== null,
  })
}

/** Standorte (ändern sich selten). */
export function useStandorte() {
  return useQuery({ queryKey: ['standorte'], queryFn: ladeStandorte, staleTime: 30 * 60_000 })
}

/** Änderung an Verträgen: lädt danach auch Offerten und Pipeline neu (gleicher Stand dort). */
export function useVertragAenderung<A, R = unknown>(aktion: (a: A) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aktion,
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: VERTRAG_SCHLUESSEL }),
        qc.invalidateQueries({ queryKey: ['offerten'] }),
        qc.invalidateQueries({ queryKey: ['verkauf'] }),
      ])
    },
  })
}

/** Einstellung «werkvertrag» (Unterzeichner, Ansprechperson, Standard-Bedingungen). */
export function useWerkvertragEinstellung() {
  return useQuery({
    queryKey: [...VERTRAG_SCHLUESSEL, 'einstellung'],
    queryFn: ladeEinstellung,
    staleTime: 10 * 60_000,
  })
}
