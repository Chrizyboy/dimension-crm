/**
 * Öffentliche Schnittstelle des Moduls «Baustelle & Rapporte».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'fieldwork',
  titel: { de: 'Baustelle & Rapporte', fr: 'Chantier & rapports' },
  kurztitel: { de: 'Baustelle', fr: 'Chantier' },
  untertitel: {
    de: 'Am Handy für Monteure: Rapport, Zeiterfassung, Nachträge, IBN-Protokoll',
    fr: 'Sur mobile pour les monteurs : rapport, saisie du temps, avenants, protocole MES',
  },
  pfad: '/fieldwork',
  icon: 'clipboard-check',
  gruppe: 'abwicklung',
  phase: '9b',
}

/** Die Seite: Mein Tag (Handy), Rapporte, Zeiten, Nachträge; Rapport als Seitenpanel. */
export const Baustelle = lazy(() => import('./components/Baustelle'))

/** Karte für die Startseite: Einsätze heute, offene Rapporte, Nachträge zum Prüfen. */
export const BaustelleHeute = lazy(() => import('./components/HeuteKarte'))

export { REITER } from './types'
export type * from './types'
