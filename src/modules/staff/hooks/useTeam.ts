import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { ladeAkte } from '../services/akte'
import { ladeAnlaesse } from '../services/anlaesse'
import { ladeKurse, ladeTeamUebersicht } from '../services/kurse'
import { ladeAusruestung, ladeAusweise, ladeRollen } from '../services/personal'

const mitDb = supabase !== null

/** Aktive Personen mit Rolle, Kontakt, Vorgesetzt und was sie heute tun (jede Minute frisch genug). */
export const useTeam = () =>
  useQuery({ queryKey: ['team', 'personen'], enabled: mitDb, queryFn: ladeTeamUebersicht, staleTime: 60_000 })

/** Fahrzeuge und Geräte bei einer Person. */
export const useAusruestung = (personId: string) =>
  useQuery({ queryKey: ['team', 'ausruestung', personId], enabled: mitDb, queryFn: () => ladeAusruestung(personId) })

/** Rollen für die Anforderungen. */
export const useRollen = () =>
  useQuery({ queryKey: ['team', 'rollen'], enabled: mitDb, queryFn: ladeRollen, staleTime: 10 * 60_000 })

/** Kurse eines Jahres mit Budget. */
export const useKurse = (jahr: number) =>
  useQuery({ queryKey: ['team', 'kurse', jahr], enabled: mitDb, queryFn: () => ladeKurse(jahr) })

/** Alle Ausweise. */
export const useAusweise = () => useQuery({ queryKey: ['team', 'ausweise'], enabled: mitDb, queryFn: ladeAusweise })

/** Personal-Akte einer Person (die Datenbank gibt nur, was man sehen darf; sonst null). */
export const useAkte = (personId: string) =>
  useQuery({ queryKey: ['team', 'akte', personId], enabled: mitDb, queryFn: () => ladeAkte(personId) })

/** Geburtstage und Dienstjubiläen der nächsten Tage für «Mein Tag». */
export const useAnlaesse = () =>
  useQuery({ queryKey: ['team', 'anlaesse'], enabled: mitDb, queryFn: ladeAnlaesse, staleTime: 30 * 60_000 })

/** Nach einer Änderung alles neu laden; auch die Fristen unter «Fahrzeuge & Geräte», Ausweis-Arten und Tätigkeiten. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['team'] }),
      qc.invalidateQueries({ queryKey: ['fuhrpark'] }),
      qc.invalidateQueries({ queryKey: ['auswahl', 'qualifikation'] }),
      qc.invalidateQueries({ queryKey: ['auswahl', 'taetigkeit'] }),
    ])
}
