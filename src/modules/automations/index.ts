/**
 * Öffentliche Schnittstelle des Moduls «Automationen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
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
  // Automationen handeln im Namen der Firma; einrichten nur die Administration (RLS prüft zusätzlich).
  recht: 'admin',
}

/** Die Seite mit den Reitern Automationen, Protokoll und Einstellungen. */
export const Automationen = lazy(() => import('./components/Automationen'))

export { ANSICHTEN } from './types'
export type * from './types'
