/**
 * Öffentliche Schnittstelle des Moduls «Handbuch».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'knowledge',
  titel: { de: 'Handbuch', fr: 'Manuel' },
  untertitel: { de: 'Anleitungen, Vorlagen und Know-how', fr: 'Guides, modèles et savoir-faire' },
  pfad: '/knowledge',
  icon: 'book-open',
  gruppe: 'weitere',
  phase: 15,
}

export type * from './types'
