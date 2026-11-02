import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as l from '../services/leitung'
import { mitAblage } from '../services/warteschlange'

const an = Boolean(supabase)

/** Baustellen-Mappe; am Gerät abgelegt, damit sie auf dem Dach ohne Netz geht. */
export const useMappe = (projekt: string | null) =>
  useQuery({
    queryKey: ['baustelle', 'mappe', projekt],
    networkMode: 'always',
    enabled: an && Boolean(projekt),
    queryFn: () => mitAblage(`mappe:${projekt ?? ''}`, () => l.ladeMappe(projekt ?? '')),
  })

/** Sicherheits-Check und Zeit-Regeln, am Gerät abgelegt. */
export const useEinstellung = () =>
  useQuery({
    queryKey: ['baustelle', 'einstellung'],
    networkMode: 'always',
    enabled: an,
    staleTime: 30 * 60_000,
    queryFn: () => mitAblage('baustelle-einstellung', l.ladeEinstellung),
  })

export const useHeute = (tag?: string) =>
  useQuery({ queryKey: ['baustelle', 'heute', tag], enabled: an, refetchInterval: 120_000, queryFn: () => l.ladeHeute(tag) })

export const useBaustellen = () =>
  useQuery({ queryKey: ['baustelle', 'baustellen'], enabled: an, queryFn: () => l.ladeBaustellen() })

export const useAkte = (projekt: string) =>
  useQuery({ queryKey: ['baustelle', 'akte', projekt], enabled: an, queryFn: () => l.ladeAkte(projekt) })

export const useWochenblatt = (montag: string) =>
  useQuery({ queryKey: ['baustelle', 'wochenblatt', montag], enabled: an, queryFn: () => l.ladeWochenblatt(montag) })

export const useAuswertung = (von: string, bis: string) =>
  useQuery({ queryKey: ['baustelle', 'auswertung', von, bis], enabled: an, queryFn: () => l.ladeAuswertung(von, bis) })

export const useMeldungen = (nurOffen: boolean) =>
  useQuery({ queryKey: ['baustelle', 'meldungen', nurOffen], enabled: an, queryFn: () => l.ladeMeldungen(nurOffen) })
