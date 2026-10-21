/**
 * Öffentliche Schnittstelle des Moduls «Kontakte».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'contacts',
  titel: { de: 'Kontakte', fr: 'Contacts' },
  pfad: '/contacts',
  icon: 'book-user',
  gruppe: 'verkauf',
  phase: 5,
}

export type * from './types'
