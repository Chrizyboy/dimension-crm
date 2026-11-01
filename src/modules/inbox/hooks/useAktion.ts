import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from './usePosteingang'

/**
 * Führt eine Änderung aus, lädt danach die Mails neu und zeigt Fehler verständlich: fachliche Fehler der
 * Datenbank übersetzt, technische mit Meldung «Nicht gespeichert».
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
      else {
        meldeFehler(e, 'posteingang')
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
