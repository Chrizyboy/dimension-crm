import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as pl from '../services/planung'
import * as s from '../services/projekte'
import * as su from '../services/subunternehmer'
import type { ProjektStatus } from '../types'

const an = Boolean(supabase)

/** Projekte in den gewählten Status. */
export const useProjekte = (status: ProjektStatus[]) =>
  useQuery({ queryKey: ['projekte', 'liste', status], enabled: an, queryFn: () => s.ladeProjekte(status) })

/** Ein Projekt mit Fahrplan. */
export function useProjekt(id: string | null) {
  const aktiv = an && Boolean(id)
  const p = id ?? ''
  return {
    projekt: useQuery({ queryKey: ['projekte', 'projekt', id], enabled: aktiv, queryFn: () => s.ladeProjekt(p) }),
    fahrplan: useQuery({ queryKey: ['projekte', 'fahrplan', id], enabled: aktiv, queryFn: () => s.ladeFahrplan(p) }),
  }
}

/** Bewilligungs-Schritte aller Projekte. */
export const useBewilligungen = () =>
  useQuery({ queryKey: ['projekte', 'bewilligungen'], enabled: an, queryFn: s.ladeBewilligungen })

/** Einsätze im Zeitraum. */
export const useEinsaetze = (von: string, bis: string) =>
  useQuery({ queryKey: ['projekte', 'einsaetze', von, bis], enabled: an, queryFn: () => pl.ladeEinsaetze(von, bis) })

/** Einsätze eines Projekts. */
export const useProjektEinsaetze = (id: string) =>
  useQuery({
    queryKey: ['projekte', 'einsaetze', 'projekt', id],
    enabled: an,
    queryFn: () => pl.ladeProjektEinsaetze(id),
  })

/** Abwesenheiten im Zeitraum. */
export const useAbwesenheiten = (von: string, bis: string) =>
  useQuery({
    queryKey: ['projekte', 'abwesenheiten', von, bis],
    enabled: an,
    queryFn: () => pl.ladeAbwesenheiten(von, bis),
  })

/** Aktive Personen (ändern sich selten). */
export const usePersonen = () =>
  useQuery({ queryKey: ['projekte', 'personen'], enabled: an, queryFn: pl.ladePersonen, staleTime: 10 * 60_000 })

/** Standorte Muri und Bulle. */
export const useStandorte = () =>
  useQuery({ queryKey: ['projekte', 'standorte'], enabled: an, queryFn: s.ladeStandorte, staleTime: 30 * 60_000 })

/** Ablauf-Vorlagen. */
export const useAblaeufe = () =>
  useQuery({ queryKey: ['projekte', 'ablaeufe'], enabled: an, queryFn: s.ladeAblaeufe, staleTime: 30 * 60_000 })

/** Alle Subunternehmer. */
export const useSubunternehmer = () =>
  useQuery({ queryKey: ['projekte', 'subunternehmer'], enabled: an, queryFn: su.ladeSubunternehmer })

/** Aufträge an Subunternehmer zu einem Projekt. */
export const useSubauftraege = (projektId: string) =>
  useQuery({
    queryKey: ['projekte', 'subauftraege', projektId],
    enabled: an,
    queryFn: () => su.ladeSubauftraege(projektId),
  })

/** Nach einer Änderung alles zu den Projekten neu laden (auch Kunden, deren Stand vom Projekt abhängt). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['projekte'] }), qc.invalidateQueries({ queryKey: ['kontakte'] })])
}
