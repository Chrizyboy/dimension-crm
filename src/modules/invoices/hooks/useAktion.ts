import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { IntegrationsFehler, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from './useRechnungen'

/**
 * Führt eine Änderung aus, lädt danach Rechnungen und Projekte neu und zeigt Fehler verständlich: fachliche
 * Fehler der Datenbank und Fehler von AbaNinja (z. B. «schon bezahlt») übersetzt, technische mit Meldung «Nicht gespeichert».
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
      else if (e instanceof IntegrationsFehler) meldeIntegrationsFehler(e)
      else {
        meldeFehler(e, 'rechnungen')
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
