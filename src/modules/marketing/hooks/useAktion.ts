import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { IntegrationsFehler, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useMarketingNeuLaden } from './useMarketing'

/**
 * Führt eine Änderung aus, lädt danach das Marketing neu und zeigt Fehler verständlich: fachliche Fehler der
 * Datenbank übersetzt, Fehler der Server-Funktionen (Meta, LinkedIn, Canva) mit ihrem Code, sonst «Nicht gespeichert».
 */
export function useAktion() {
  const [laeuft, setLaeuft] = useState(false)
  const neuLaden = useMarketingNeuLaden()
  async function aus<T>(f: () => Promise<T>, erfolg?: { de: string; fr: string }): Promise<T | undefined> {
    setLaeuft(true)
    try {
      const r = await f()
      if (erfolg) melde('ok', erfolg)
      return r
    } catch (e) {
      const s = fachFehlerSchluessel(e instanceof IntegrationsFehler ? { message: e.code } : e)
      if (s) melde('kritisch', zweisprachig(s))
      else if (e instanceof IntegrationsFehler) meldeIntegrationsFehler(e)
      else {
        meldeFehler(e, 'marketing')
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      }
      return undefined
    } finally {
      setLaeuft(false)
      void neuLaden()
    }
  }
  return { laeuft, aus }
}
