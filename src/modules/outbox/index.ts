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
    de: 'Mails und SMS prüfen, freigeben und senden',
    fr: 'Vérifier, approuver et envoyer les e-mails et SMS',
  },
  pfad: '/outbox',
  icon: 'send',
  gruppe: 'uebersicht',
  phase: 8,
}

/** Die Seite: Liste mit Filter, Seitenblatt zum Prüfen, Freigeben oder Verwerfen. */
export const Ausgangskorb = lazy(() => import('./components/Ausgangskorb'))

export type * from './types'
