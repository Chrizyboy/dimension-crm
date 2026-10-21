import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ladeEingang,
  ladeEturnityMeldungen,
  ladeOffertDokumente,
  ladeOfferten,
  ladeOffertVerlauf,
  ladePersonen,
} from '../services/offerten'
import type { Offerte } from '../types'

/** Zwischenspeicher-Schlüssel aller Offertdaten. */
export const OFFERTEN_SCHLUESSEL = ['offerten'] as const

/** Alle Offerten (Muri, Bulle, Nachfassen). */
export function useOfferten() {
  return useQuery({ queryKey: [...OFFERTEN_SCHLUESSEL, 'liste'], queryFn: ladeOfferten })
}

/** «Neue Offerten» des Innendiensts. */
export function useEingang() {
  return useQuery({ queryKey: [...OFFERTEN_SCHLUESSEL, 'eingang'], queryFn: ladeEingang })
}

/** Aktive Personen für «Zuständig»; ändert sich selten. */
export function usePersonen() {
  return useQuery({ queryKey: ['personen', 'aktiv'], queryFn: ladePersonen, staleTime: 10 * 60_000 })
}

/** Verlauf und Dokumente einer offenen Offerte. */
export function useOffertAkte(o: Offerte | null) {
  const verlauf = useQuery({
    queryKey: [...OFFERTEN_SCHLUESSEL, 'verlauf', o?.id],
    queryFn: () => (o ? ladeOffertVerlauf(o) : []),
    enabled: o !== null,
  })
  const dokumente = useQuery({
    queryKey: [...OFFERTEN_SCHLUESSEL, 'dokumente', o?.id],
    queryFn: () => (o ? ladeOffertDokumente(o.id) : []),
    enabled: o !== null,
  })
  return { verlauf, dokumente }
}

/** Offene Meldungen aus Eturnity. */
export function useEturnityMeldungen() {
  return useQuery({ queryKey: [...OFFERTEN_SCHLUESSEL, 'eturnity'], queryFn: ladeEturnityMeldungen })
}

/**
 * Änderung an Offerten: lädt danach Offerten, Pipeline (Anfragen & Leads) und Kundenakten neu,
 * weil derselbe Stand dort ebenfalls erscheint.
 */
export function useOffertAenderung<A, R = unknown>(aktion: (a: A) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aktion,
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: OFFERTEN_SCHLUESSEL }),
        qc.invalidateQueries({ queryKey: ['verkauf'] }),
        qc.invalidateQueries({ queryKey: ['kontakte'] }),
      ])
    },
  })
}
