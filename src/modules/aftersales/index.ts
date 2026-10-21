/**
 * Öffentliche Schnittstelle des Moduls «Service».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'aftersales',
  titel: { de: 'Service', fr: 'Service après-vente' },
  pfad: '/aftersales',
  icon: 'wrench',
  gruppe: 'abwicklung',
  phase: 9,
}

export type * from './types'
