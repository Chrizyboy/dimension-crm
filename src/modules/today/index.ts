/**
 * Öffentliche Schnittstelle des Moduls «Heute».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'today',
  titel: { de: 'Heute', fr: 'Aujourd’hui' },
  pfad: '/today',
  icon: 'sun',
  gruppe: 'uebersicht',
  phase: 14,
}

export type * from './types'
