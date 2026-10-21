/**
 * Öffentliche Schnittstelle des Moduls «Aufgaben».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'tasks',
  titel: { de: 'Aufgaben', fr: 'Tâches' },
  pfad: '/tasks',
  icon: 'square-check',
  gruppe: 'uebersicht',
  phase: 6,
}

export type * from './types'
