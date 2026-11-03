import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { PREIS_SCHLUESSEL } from './usePreise'

/**
 * Kleine Änderung ausführen (Regeln, Leistungen, Bausteine): danach Preise neu laden, kurz bestätigen,
 * Fachfehler aus der Datenbank übersetzt melden. `arbeitet` sperrt Knöpfe, solange es läuft.
 */
export function useAusfuehren(bereich: string) {
  const qc = useQueryClient()
  const [arbeitet, setArbeitet] = useState(false)
  async function fuehreAus(aktion: () => Promise<unknown>, ok: string | null = 'preise.regel.gespeichert') {
    setArbeitet(true)
    try {
      await aktion()
      await qc.invalidateQueries({ queryKey: PREIS_SCHLUESSEL })
      if (ok) melde('ok', zweisprachig(ok))
      return true
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (!s) meldeFehler(e, bereich)
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
      return false
    } finally {
      setArbeitet(false)
    }
  }
  return { arbeitet, fuehreAus }
}
