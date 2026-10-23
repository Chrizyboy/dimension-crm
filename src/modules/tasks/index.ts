/**
 * Öffentliche Schnittstelle des Moduls «Aufgaben».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'tasks',
  titel: { de: 'Aufgaben', fr: 'Tâches' },
  untertitel: { de: 'Was wer bis wann erledigt', fr: 'Qui fait quoi et pour quand' },
  pfad: '/tasks',
  icon: 'square-check',
  gruppe: 'uebersicht',
  phase: 6,
  immer: true,
}

/** Die Seite «Aufgaben» (meine/alle, offen/erledigt). */
export const Aufgaben = lazy(() => import('./components/Aufgaben'))

export type * from './types'
