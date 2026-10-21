/**
 * Öffentliche Schnittstelle des Moduls «Automationen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'automations',
  titel: { de: 'Automationen', fr: 'Automatisations' },
  untertitel: { de: 'Abläufe, die von selbst laufen', fr: 'Processus qui tournent tout seuls' },
  pfad: '/automations',
  icon: 'workflow',
  gruppe: 'verwaltung',
  phase: 12,
}

export type * from './types'
