/**
 * Öffentliche Schnittstelle des Moduls «Ausgangskorb».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'outbox',
  titel: { de: 'Ausgangskorb', fr: "Boîte d'envoi" },
  untertitel: {
    de: 'Mails, SMS und Briefe prüfen, freigeben und nachverfolgen',
    fr: 'Vérifier, valider et suivre e-mails, SMS et lettres',
  },
  pfad: '/outbox',
  icon: 'send',
  gruppe: 'uebersicht',
  phase: 8,
}

/** Die Seite: Werkbank mit Ordnern, Liste und der Nachricht zum Prüfen, Freigeben oder Verwerfen. */
export const Ausgangskorb = lazy(() => import('./components/Ausgangskorb'))

/** Karte «Wartet auf deine Freigabe» für «Mein Tag» (erscheint nur, wenn etwas offen ist). */
export const AusgangHeute = lazy(() => import('./components/HeuteKarte'))

export { AUSGANG_ORDNER } from './types'

export type * from './types'
