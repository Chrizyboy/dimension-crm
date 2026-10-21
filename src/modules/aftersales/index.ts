/**
 * Öffentliche Schnittstelle des Moduls «Service & Garantie».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'aftersales',
  titel: { de: 'Service & Garantie', fr: 'Service & garantie' },
  untertitel: { de: 'Störungen, Reklamationen und Nachkontrollen', fr: 'Pannes, réclamations et contrôles' },
  pfad: '/aftersales',
  icon: 'wrench',
  gruppe: 'abwicklung',
  phase: 9,
}

export type * from './types'
