/**
 * Öffentliche Schnittstelle des Moduls «Mein Tag».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'today',
  titel: { de: 'Mein Tag', fr: 'Ma journée' },
  untertitel: { de: 'Termine, Aufgaben und Fälliges von heute', fr: 'Rendez-vous, tâches et échéances du jour' },
  pfad: '/today',
  icon: 'sun',
  gruppe: 'uebersicht',
  phase: 14,
  immer: true,
}

/** Die Seite «Mein Tag»; die Startseite setzt KI-Briefing und Karten der Bereiche dazu. */
export const MeinTag = lazy(() => import('./components/MeinTag'))

export type * from './types'
