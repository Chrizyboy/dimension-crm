/**
 * Öffentliche Schnittstelle des Moduls «Kunden».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'customers',
  titel: { de: 'Kunden', fr: 'Clients' },
  pfad: '/customers',
  icon: 'contact',
  gruppe: 'verkauf',
  phase: 5,
}

export type * from './types'
