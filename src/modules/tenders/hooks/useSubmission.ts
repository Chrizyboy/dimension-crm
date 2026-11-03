import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeLeitstand, ladeRegeln } from '../services/ausschreibungen'
import * as s from '../services/submission'

const an = Boolean(supabase)

/** Alle offenen und kürzlich entschiedenen Dossiers für Leitstand und Fristen. */
export const useLeitstand = () =>
  useQuery({
    queryKey: ['ausschreibungen', 'leitstand'],
    enabled: an,
    queryFn: ladeLeitstand,
    refetchInterval: 300_000,
  })

/** Regeln des Monitors (Checkliste, Nachweis-Arten, No-Go-Gründe …). */
export const useRegeln = () => useQuery({ queryKey: ['ausschreibungen', 'regeln'], enabled: an, queryFn: ladeRegeln })

/** Go/No-Go-Vorschlag eines Dossiers. */
export const useGng = (id: string, aktiv = true) =>
  useQuery({ queryKey: ['ausschreibungen', 'gng', id], enabled: an && aktiv, queryFn: () => s.ladeGng(id) })

/** Öffnungsprotokoll eines Dossiers. */
export const useProtokoll = (id: string, aktiv = true) =>
  useQuery({ queryKey: ['ausschreibungen', 'protokoll', id], enabled: an && aktiv, queryFn: () => s.ladeProtokoll(id) })

/** Nachweise und Firmen. */
export const useNachweise = () =>
  useQuery({ queryKey: ['ausschreibungen', 'nachweise'], enabled: an, queryFn: s.ladeNachweise })

/** Referenzliste. */
export const useReferenzen = () =>
  useQuery({ queryKey: ['ausschreibungen', 'referenzen'], enabled: an, queryFn: s.ladeReferenzen })

/** Projekte, die Referenz werden könnten. */
export const useReferenzVorschlaege = (aktiv: boolean) =>
  useQuery({
    queryKey: ['ausschreibungen', 'referenzen', 'vorschlaege'],
    enabled: an && aktiv,
    queryFn: s.ladeReferenzVorschlaege,
  })

/** Mitbewerber. */
export const useMitbewerber = () =>
  useQuery({ queryKey: ['ausschreibungen', 'mitbewerber'], enabled: an, queryFn: s.ladeMitbewerber })

/** Auswertung eines Zeitraums. */
export const useAuswertung = (von: string, bis: string) =>
  useQuery({
    queryKey: ['ausschreibungen', 'auswertung', von, bis],
    enabled: an,
    queryFn: () => s.ladeAuswertung(von, bis),
  })

/** Aktive Personen (für «verantwortlich»). */
export const usePersonen = () =>
  useQuery({ queryKey: ['ausschreibungen', 'personen'], enabled: an, queryFn: s.ladePersonen, staleTime: 600_000 })
