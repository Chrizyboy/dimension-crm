import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as b from '../services/bestellungen'
import * as l from '../services/lager'
import * as m from '../services/material'
import type { BestellFilter } from '../types'

const an = Boolean(supabase)

/** Bestellungen nach Filter, auf Wunsch nur die eines Projekts. */
export const useBestellungen = (filter: BestellFilter, projektId?: string) =>
  useQuery({
    queryKey: ['einkauf', 'bestellungen', filter, projektId ?? null],
    enabled: an,
    queryFn: () => b.ladeBestellungen(filter, projektId),
  })

/** Eine Bestellung mit Positionen. */
export const useBestellung = (id: string) =>
  useQuery({ queryKey: ['einkauf', 'bestellung', id], enabled: an, queryFn: () => b.ladeBestellung(id) })

/** Offene Projekte für «Material je Projekt», mit Zählern der Materialliste. */
export const useMaterialProjekte = () =>
  useQuery({
    queryKey: ['einkauf', 'material-projekte'],
    enabled: an,
    queryFn: async () => {
      const [projekte, zaehler] = await Promise.all([m.ladeMaterialProjekte(), m.ladeMaterialZaehler()])
      return projekte.map((p) => ({
        ...p,
        zeilen: zaehler.get(p.id)?.zeilen ?? 0,
        fehlt: zaehler.get(p.id)?.fehlt ?? 0,
      }))
    },
  })

/** Materialliste eines Projekts. */
export const useMaterial = (projektId: string) =>
  useQuery({ queryKey: ['einkauf', 'material', projektId], enabled: an, queryFn: () => m.ladeMaterial(projektId) })

export const useLager = () => useQuery({ queryKey: ['einkauf', 'lager'], enabled: an, queryFn: l.ladeLager })

export const useLagerorte = () =>
  useQuery({ queryKey: ['einkauf', 'lagerorte'], enabled: an, queryFn: l.ladeLagerorte, staleTime: 30 * 60_000 })

export const useLieferanten = () =>
  useQuery({ queryKey: ['einkauf', 'lieferanten'], enabled: an, queryFn: l.ladeLieferanten })

/** Nach einer Änderung alles zum Einkauf neu laden (auch den Fahrplan der Projekte). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['einkauf'] }),
      qc.invalidateQueries({ queryKey: ['projekte'] }),
    ])
  }
}
