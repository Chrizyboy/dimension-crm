import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { ladeAutomationen, ladeEinstellungen, ladeKatalog, ladeLaeufe, type LaufFilter } from '../services/automationen'

const mitDb = supabase !== null

/** Alle Automationen. */
export const useAutomationen = () =>
  useQuery({ queryKey: ['automationen', 'liste'], queryFn: ladeAutomationen, enabled: mitDb })

/** Bausteine für den Editor; ändern sich nur mit einer neuen Version. */
export const useKatalog = () =>
  useQuery({ queryKey: ['automationen', 'katalog'], queryFn: ladeKatalog, enabled: mitDb, staleTime: Infinity })

/** Läufe fürs Protokoll; jede Minute neu, damit «wartet» und «fertig» stimmen. */
export const useLaeufe = (filter: LaufFilter) =>
  useQuery({
    queryKey: ['automationen', 'laeufe', filter],
    queryFn: () => ladeLaeufe(filter),
    enabled: mitDb,
    refetchInterval: 60_000,
  })

/** Einstellungen der Auslöser nach Datum. */
export const useAutomationsEinstellungen = () =>
  useQuery({ queryKey: ['einstellungen', 'automationen'], queryFn: ladeEinstellungen, enabled: mitDb })

/**
 * Führt eine Änderung aus, lädt danach die Automationen neu und zeigt Fehler verständlich
 * (fachliche Fehler der Datenbank übersetzt, sonst «Nicht gespeichert»).
 */
export function useAktion() {
  const [laeuft, setLaeuft] = useState(false)
  const client = useQueryClient()
  async function aus<T>(f: () => Promise<T>, erfolg?: { de: string; fr: string }): Promise<T | undefined> {
    setLaeuft(true)
    try {
      const r = await f()
      if (erfolg) melde('ok', erfolg)
      return r
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(e, 'automationen')
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      }
      return undefined
    } finally {
      setLaeuft(false)
      void client.invalidateQueries({ queryKey: ['automationen'] })
      void client.invalidateQueries({ queryKey: ['einstellungen', 'automationen'] })
    }
  }
  return { laeuft, aus }
}
