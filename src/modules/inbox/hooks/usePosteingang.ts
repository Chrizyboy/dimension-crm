import { useQuery, useQueryClient } from '@tanstack/react-query'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Betrachter } from '../lib/anzeige'
import {
  ladeAeltere,
  ladeAuswertung,
  ladeMails,
  ladeNachholen,
  ladePersonen,
  ladeRegeln,
  ladeText,
} from '../services/posteingang'

const mitDb = supabase !== null

/** Alle sichtbaren Mails; jede Minute neu, damit Fristen und neue Mails ohne Klick erscheinen. */
export const useMails = (aktiv = true) =>
  useQuery({
    queryKey: ['posteingang', 'liste'],
    enabled: mitDb && aktiv,
    queryFn: ladeMails,
    refetchInterval: 60_000,
  })

/** Ältere Mails mit Suche (nur, wenn die Ansicht offen ist). */
export const useAeltere = (suche: string, aktiv: boolean) =>
  useQuery({
    queryKey: ['posteingang', 'aeltere', suche],
    enabled: mitDb && aktiv,
    queryFn: () => ladeAeltere(suche),
    placeholderData: (vorher) => vorher,
  })

/** Stand des Nachholens (Einstellungen); alle 30 Sekunden neu, solange es läuft. */
export const useNachholen = () =>
  useQuery({ queryKey: ['posteingang', 'nachholen'], enabled: mitDb, queryFn: ladeNachholen, refetchInterval: 30_000 })

/** Volltext einer Mail aus Outlook (einmal pro Mail). */
export const useText = (id: string) =>
  useQuery({
    queryKey: ['posteingang', 'text', id],
    enabled: mitDb && Boolean(id),
    queryFn: () => ladeText(id),
    retry: false,
    staleTime: Infinity,
  })

/** Auswertung der Reaktionszeit. */
export const useAuswertung = () =>
  useQuery({ queryKey: ['posteingang', 'auswertung'], enabled: mitDb, queryFn: () => ladeAuswertung(8) })

/** Einstellung «posteingang». */
export const useRegeln = () =>
  useQuery({ queryKey: ['posteingang', 'regeln'], enabled: mitDb, queryFn: ladeRegeln, staleTime: 10 * 60_000 })

/** Aktive Personen. */
export const usePersonen = () =>
  useQuery({ queryKey: ['posteingang', 'personen'], enabled: mitDb, queryFn: ladePersonen, staleTime: 10 * 60_000 })

/** Nach einer Änderung alles im Bereich neu laden (ausser dem Volltext). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['posteingang'], predicate: (q) => q.queryKey[1] !== 'text' })
}

/** Wer schaut: meine Person und ob ich Mails aus Team-Postfächern verteile (Kürzel in «verteilen» oder Administration). */
export function useBetrachter(): Betrachter {
  const ich = useAnmeldung((z) => z.ich)
  const regeln = useRegeln().data
  const verteile =
    hatRecht(ich, 'admin') ||
    Boolean(ich && (regeln?.verteilen ?? []).map((k) => k.toLowerCase()).includes(ich.kuerzel.toLowerCase()))
  return { ich: ich?.id ?? null, verteile }
}
