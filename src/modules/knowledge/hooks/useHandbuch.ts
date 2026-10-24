import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { ladeAnhaenge, ladeMeldungen } from '../services/meldungen'
import { ladeDateien, ladeHandbuch } from '../services/handbuch'

/** Prozesse und Videos. */
export function useHandbuch() {
  return useQuery({ queryKey: ['handbuch'], queryFn: ladeHandbuch, enabled: supabase !== null })
}

/** Dateien früherer Versionen, erst wenn man sie aufklappt. */
export function useDateien(ids: string[], aktiv: boolean) {
  return useQuery({ queryKey: ['handbuch', 'dateien', ids], queryFn: () => ladeDateien(ids), enabled: aktiv })
}

/** Meldungen (eigene oder, für die Administration, alle). */
export function useMeldungen() {
  return useQuery({ queryKey: ['meldungen'], queryFn: ladeMeldungen, enabled: supabase !== null })
}

/** Anhänge einer Meldung, wenn sie offen ist. */
export function useAnhaenge(meldungId: string | null) {
  return useQuery({
    queryKey: ['meldungen', 'anhaenge', meldungId],
    queryFn: () => ladeAnhaenge(meldungId ?? ''),
    enabled: meldungId !== null,
  })
}

/**
 * Führt eine Änderung aus, lädt Handbuch und Meldungen neu und zeigt Fehler verständlich: fachliche Fehler
 * der Datenbank (z. B. «gibt es schon») übersetzt, technische mit «Nicht gespeichert».
 */
export function useAktion() {
  const client = useQueryClient()
  const [laeuft, setLaeuft] = useState(false)
  async function aus(f: () => Promise<unknown>, erfolg?: { de: string; fr: string }): Promise<boolean> {
    setLaeuft(true)
    try {
      await f()
      if (erfolg) melde('ok', erfolg)
      return true
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(e, 'handbuch')
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      }
      return false
    } finally {
      setLaeuft(false)
      void client.invalidateQueries({ queryKey: ['handbuch'] })
      void client.invalidateQueries({ queryKey: ['meldungen'] })
    }
  }
  return { laeuft, aus }
}
