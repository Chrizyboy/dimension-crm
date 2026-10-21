/**
 * Öffentliche Schnittstelle des Moduls «Mein Tag».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
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

export type * from './types'
