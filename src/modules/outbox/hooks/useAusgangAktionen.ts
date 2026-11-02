import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { ausgangJetztSenden, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { freigeben, verwerfen, zurueckholen } from '../services/ausgang'
import { useAusgangNeuLaden } from './useAusgang'

/** So lange kann man eine Freigabe zurückholen (Chris' Wahl, Frage 3: A = 10 Sekunden). */
export const RUECKGAENGIG_S = 10

/** Fehler aus Datenbank oder Server als Meldung, nie still. */
export function zeigeFehler(e: unknown): void {
  const s = fachFehlerSchluessel(e)
  if (s) melde('kritisch', zweisprachig(s))
  else if (e instanceof Error && e.name === 'IntegrationsFehler') meldeIntegrationsFehler(e)
  else {
    meldeFehler(e, 'ausgang')
    melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
  }
}

/**
 * Aktionen, die Liste und Akte teilen: freigeben mit «Rückgängig», später senden, mehrere verwerfen.
 * Nach der Rückgängig-Frist stösst die App den Versand an, damit es nicht bis zur nächsten Minute dauert.
 */
export function useAusgangAktionen() {
  const neuLaden = useAusgangNeuLaden()
  const [laeuft, setLaeuft] = useState(false)

  async function ausfuehren(f: () => Promise<void>): Promise<boolean> {
    setLaeuft(true)
    try {
      await f()
      return true
    } catch (e) {
      zeigeFehler(e)
      return false
    } finally {
      setLaeuft(false)
      void neuLaden()
    }
  }

  /** Freigeben; ohne Sendezeit mit kurzer Frist zum Zurückholen, danach sofort senden. */
  function freigebenUndSenden(ids: string[], sendeAb: Date | null = null) {
    return ausfuehren(async () => {
      const n = await freigeben(ids, { sendeAb, wartenS: sendeAb ? 0 : RUECKGAENGIG_S })
      if (n === 0) {
        melde('info', { de: 'Nichts freigegeben (schon erledigt)', fr: 'Rien validé (déjà traité)' })
        return
      }
      let geholt = false
      if (sendeAb) {
        const wann = sendeAb.toLocaleString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        melde('ok', { de: `${n} geplant für ${wann}`, fr: `${n} planifié(s) pour ${wann}` })
        return
      }
      melde(
        'ok',
        { de: `${n} freigegeben · geht in ${RUECKGAENGIG_S} Sek. raus`, fr: `${n} validé(s) · envoi dans ${RUECKGAENGIG_S} s` },
        {
          aktion: {
            text: { de: 'Rückgängig', fr: 'Annuler' },
            ausfuehren: () => {
              geholt = true
              void zurueckholen(ids)
                .then(() => {
                  melde('info', { de: 'Zurückgeholt, wartet wieder', fr: 'Récupéré, de nouveau en attente' })
                })
                .catch(zeigeFehler)
                .finally(() => void neuLaden())
            },
          },
        },
      )
      window.setTimeout(() => {
        if (geholt) return
        void ausgangJetztSenden()
          .catch(() => null)
          .finally(() => void neuLaden())
      }, (RUECKGAENGIG_S + 1) * 1000)
    })
  }

  /** Mehrere nicht senden, mit demselben Grund. */
  function verwerfenMehrere(ids: string[], grund: string) {
    return ausfuehren(async () => {
      for (const id of ids) await verwerfen(id, grund)
      melde('ok', { de: `${ids.length} nicht gesendet`, fr: `${ids.length} non envoyé(s)` })
    })
  }

  return { laeuft, ausfuehren, freigebenUndSenden, verwerfenMehrere, neuLaden }
}
