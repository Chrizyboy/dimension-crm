/**
 * Öffentliche Schnittstelle des Moduls «Ausschreibungen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'tenders',
  titel: { de: 'Ausschreibungen', fr: 'Appels d’offres' },
  untertitel: { de: 'Öffentliche Aufträge und Baugesuche finden', fr: 'Marchés publics et permis de construire' },
  pfad: '/tenders',
  icon: 'gavel',
  gruppe: 'akquise',
  phase: '8b',
}

/** Die Seite: Reiter Leitstand, Bewilligen, Senden, Fristen, Nachweise, Auswertung, Quellen; Akte als ganze Seite. */
export const Ausschreibungen = lazy(() => import('./components/Ausschreibungen'))

/** Karte für die Startseite: was heute beim Monitor ansteht (meldet es einmal täglich über die Glocke). */
export const AusschreibungenHeute = lazy(() => import('./components/HeuteKarte'))

export { REITER } from './types'
export type * from './types'
