import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { bildAdressen, ladeAnhaenge, ladeHelpdeskStand, ladeMeldungen } from '../services/meldungen'
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

/** Wer über Meldungen entscheidet (nur für die Administration geladen). */
export function useHelpdeskStand(admin: boolean) {
  return useQuery({ queryKey: ['meldungen', 'stand'], queryFn: ladeHelpdeskStand, enabled: supabase !== null && admin })
}

/**
 * Anhänge einer Meldung mit kurz gültigen Adressen für die Vorschaubilder. Neu geladen nach 8 Minuten,
 * bevor die Adressen (10 Minuten) verfallen.
 */
export function useAnhaenge(meldungId: string | null) {
  return useQuery({
    queryKey: ['meldungen', 'anhaenge', meldungId],
    queryFn: async () => {
      const dateien = await ladeAnhaenge(meldungId ?? '')
      const adressen: Record<string, string> = await bildAdressen(dateien).catch(() => ({}))
      return { dateien, adressen }
    },
    enabled: meldungId !== null,
    staleTime: 8 * 60_000,
    refetchInterval: 8 * 60_000,
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
