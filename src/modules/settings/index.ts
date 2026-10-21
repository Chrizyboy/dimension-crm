/**
 * Öffentliche Schnittstelle des Moduls «Einstellungen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'settings',
  titel: { de: 'Einstellungen', fr: 'Paramètres' },
  pfad: '/settings',
  icon: 'settings',
  gruppe: 'verwaltung',
  phase: 4,
}

export type * from './types'
