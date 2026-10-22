import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from './useAusschreibungen'

/**
 * Führt eine Änderung aus, lädt danach alles zum Monitor neu und zeigt Fehler verständlich: fachliche
 * Fehler der Datenbank (z. B. «gesperrt») übersetzt, technische mit Meldung «Nicht gespeichert».
 */
export function useAktion() {
  const [laeuft, setLaeuft] = useState(false)
  const neuLaden = useNeuLaden()
  async function aus(f: () => Promise<unknown>, erfolg?: { de: string; fr: string }): Promise<boolean> {
    setLaeuft(true)
    try {
      await f()
      if (erfolg) melde('ok', erfolg)
      return true
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (s) melde('kritisch', zweisprachig(s))
      else if (e instanceof Error && e.name === 'IntegrationsFehler') meldeIntegrationsFehler(e)
      else {
        meldeFehler(e, 'ausschreibungen')
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      }
      return false
    } finally {
      setLaeuft(false)
      void neuLaden()
    }
  }
  return { laeuft, aus }
}
