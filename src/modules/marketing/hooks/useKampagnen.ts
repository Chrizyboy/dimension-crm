import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import {
  ladeBudget,
  ladeKampagnenLeads,
  ladeKampagnenZahlen,
  ladeKostenOffen,
  ladePersonen,
  ladeQuellen,
  ladeVersaende,
  ladeWerbekampagnen,
  ladeWerbemittel,
  ladeZielgruppen,
} from '../services/kampagnen'
import { ladeFotos } from '../services/mediathek'

const mitDb = supabase !== null

/** Kampagnen (marketing_kampagnen). Alles unter ['marketing', …], damit «neu laden» nach Aktionen alles trifft. */
export const useWerbekampagnen = () =>
  useQuery({ queryKey: ['marketing', 'werbekampagnen'], queryFn: ladeWerbekampagnen, enabled: mitDb })

export const useKampagnenZahlen = () =>
  useQuery({ queryKey: ['marketing', 'kampagnen-zahlen'], queryFn: ladeKampagnenZahlen, enabled: mitDb })

export const useQuellen = (jahr: number) =>
  useQuery({ queryKey: ['marketing', 'quellen', jahr], queryFn: () => ladeQuellen(jahr), enabled: mitDb })

/** Budget je Kanal; leer ohne Recht preise oder finanzen. */
export const useBudget = (jahr: number, an = true) =>
  useQuery({ queryKey: ['marketing', 'budget', jahr], queryFn: () => ladeBudget(jahr), enabled: mitDb && an })

export const useKampagnenLeads = () =>
  useQuery({ queryKey: ['marketing', 'kampagnen-leads'], queryFn: ladeKampagnenLeads, enabled: mitDb })

export const useVersaende = () =>
  useQuery({ queryKey: ['marketing', 'versaende'], queryFn: ladeVersaende, enabled: mitDb })

/** Nur mit Recht Finanzen sinnvoll (sonst leer). */
export const useKostenOffen = (an: boolean) =>
  useQuery({ queryKey: ['marketing', 'kosten-offen'], queryFn: ladeKostenOffen, enabled: mitDb && an })

export const useZielgruppen = () =>
  useQuery({ queryKey: ['marketing', 'zielgruppen'], queryFn: ladeZielgruppen, enabled: mitDb })

export const useWerbemittel = () =>
  useQuery({ queryKey: ['marketing', 'werbemittel'], queryFn: ladeWerbemittel, enabled: mitDb })

export const useFotos = (an = true) =>
  useQuery({ queryKey: ['marketing', 'fotos'], queryFn: ladeFotos, enabled: mitDb && an, staleTime: 60_000 })

export const usePersonen = () =>
  useQuery({ queryKey: ['marketing', 'personen'], queryFn: ladePersonen, enabled: mitDb, staleTime: 10 * 60_000 })
