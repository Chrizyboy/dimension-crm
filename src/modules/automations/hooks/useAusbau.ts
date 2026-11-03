import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import {
  ladeAenderungen,
  ladeGeplant,
  ladeKennzahlen,
  ladeLauf,
  ladeProbeDatensaetze,
  ladeUebersicht,
} from '../services/ausbau'

const mitDb = supabase !== null

/** Übersicht; jede Minute neu wie der Motor. */
export const useUebersicht = () =>
  useQuery({
    queryKey: ['automationen', 'uebersicht'],
    queryFn: ladeUebersicht,
    enabled: mitDb,
    refetchInterval: 60_000,
  })

/** Kennzahlen je Automation für die Liste. */
export const useKennzahlen = () =>
  useQuery({ queryKey: ['automationen', 'kennzahlen'], queryFn: ladeKennzahlen, enabled: mitDb })

/** Alle geplanten Schritte (Reiter «Geplant»). */
export const useGeplant = () =>
  useQuery({
    queryKey: ['automationen', 'geplant'],
    queryFn: () => ladeGeplant(),
    enabled: mitDb,
    refetchInterval: 60_000,
  })

/** Änderungsverlauf einer gespeicherten Automation. */
export const useAenderungen = (id: string | undefined) =>
  useQuery({
    queryKey: ['automationen', 'aenderungen', id],
    queryFn: () => ladeAenderungen(id ?? ''),
    enabled: mitDb && Boolean(id),
  })

/** Datensätze für den Probelauf. */
export const useProbeDatensaetze = (tabelle: string) =>
  useQuery({
    queryKey: ['automationen', 'probe', tabelle],
    queryFn: () => ladeProbeDatensaetze(tabelle),
    enabled: mitDb && tabelle !== 'keine',
  })

/** Ein Lauf nach id. */
export const useLauf = (id: string | null) =>
  useQuery({
    queryKey: ['automationen', 'lauf', id],
    queryFn: () => ladeLauf(id ?? ''),
    enabled: mitDb && Boolean(id),
  })
