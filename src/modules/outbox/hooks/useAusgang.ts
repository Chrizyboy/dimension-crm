import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { kontext, ladeAusgang, ladeWoche, pruefen } from '../services/ausgang'
import type { AusgangOrdner } from '../types'

/** Offene Ordner teilen eine Abfrage (Zähler links stimmen so mit der Liste überein). */
function abfrageOrdner(o: AusgangOrdner): AusgangOrdner {
  return o === 'gesendet' || o === 'verworfen' ? o : 'team'
}

/** Einträge eines Ordners; lädt alle 15 Sekunden neu, solange etwas unterwegs ist, sonst jede Minute. */
export function useAusgang(ordner: AusgangOrdner) {
  const o = abfrageOrdner(ordner)
  return useQuery({
    queryKey: ['ausgang', o],
    enabled: Boolean(supabase),
    queryFn: () => ladeAusgang(o),
    refetchInterval: (q) =>
      q.state.data?.some((e) => e.status === 'freigegeben' || e.status === 'wird_gesendet') ? 15_000 : 60_000,
  })
}

/** Kennzahlen der letzten 7 Tage. */
export function useAusgangWoche(aktiv: boolean) {
  return useQuery({ queryKey: ['ausgang', 'woche'], enabled: Boolean(supabase) && aktiv, queryFn: ladeWoche })
}

/** Prüfungen und Zusammenhang eines Eintrags (beim Öffnen). */
export function useAusgangAkte(id: string) {
  const p = useQuery({ queryKey: ['ausgang', 'pruefen', id], enabled: Boolean(supabase), queryFn: () => pruefen(id) })
  const k = useQuery({ queryKey: ['ausgang', 'kontext', id], enabled: Boolean(supabase), queryFn: () => kontext(id) })
  return { pruefungen: p.data ?? [], kontext: k.data ?? null, laedt: p.isPending || k.isPending }
}

/** Liste nach einer Änderung neu laden. */
export function useAusgangNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['ausgang'] })
}
