import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeEintraege, ladeFahrzeuge, ladeFristen, ladeGeraete, ladeWahl } from '../services/ressourcen'

const mitDb = supabase !== null

/** Alle Fahrzeuge. */
export const useFahrzeuge = () =>
  useQuery({ queryKey: ['fuhrpark', 'fahrzeuge'], enabled: mitDb, queryFn: ladeFahrzeuge })

/** Alle Geräte. */
export const useGeraete = () => useQuery({ queryKey: ['fuhrpark', 'geraete'], enabled: mitDb, queryFn: ladeGeraete })

/** Alle Fristen (auch Ausweise). */
export const useFristen = (aktiv = true) =>
  useQuery({ queryKey: ['fuhrpark', 'fristen'], enabled: mitDb && aktiv, queryFn: ladeFristen })

/** Verlauf eines Fahrzeugs oder Geräts. */
export const useEintraege = (bezug: { fahrzeug?: string; geraet?: string }) =>
  useQuery({
    queryKey: ['fuhrpark', 'eintraege', bezug.fahrzeug ?? bezug.geraet],
    enabled: mitDb,
    queryFn: () => ladeEintraege(bezug),
  })

/** Personen und Standorte für Auswahlfelder (selten geändert). */
export const useWahl = () =>
  useQuery({ queryKey: ['fuhrpark', 'wahl'], enabled: mitDb, queryFn: ladeWahl, staleTime: 10 * 60_000 })

/** Nach einer Änderung alles im Bereich neu laden (Fristen hängen an Fahrzeug und Gerät). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['fuhrpark'] })
}

/** Namen zu Personen, Standorten und Fahrzeugen; unbekannt oder leer ergibt «–». */
export function useNamen() {
  const wahl = useWahl().data
  const fahrzeuge = useFahrzeuge().data
  const suche = (liste: { id: string; name: string }[] | undefined, id: string | null) =>
    (id && liste?.find((x) => x.id === id)?.name) || '–'
  return {
    person: (id: string | null) => suche(wahl?.personen, id),
    standort: (id: string | null) => suche(wahl?.standorte, id),
    fahrzeug: (id: string | null) => {
      const f = id ? fahrzeuge?.find((x) => x.id === id) : undefined
      return f ? `${f.bezeichnung} (${f.kennzeichen})` : '–'
    },
  }
}
