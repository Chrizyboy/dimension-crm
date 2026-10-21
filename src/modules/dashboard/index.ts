/**
 * Öffentliche Schnittstelle des Moduls «Dashboard».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'dashboard',
  titel: { de: 'Dashboard', fr: 'Tableau de bord' },
  pfad: '/dashboard',
  icon: 'chart-column',
  gruppe: 'uebersicht',
  phase: 14,
}

export type * from './types'
