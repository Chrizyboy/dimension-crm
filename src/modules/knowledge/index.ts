/**
 * Öffentliche Schnittstelle des Moduls «Wissen & Hilfe».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'knowledge',
  titel: { de: 'Wissen & Hilfe', fr: 'Savoir & aide' },
  pfad: '/knowledge',
  icon: 'book-open',
  gruppe: 'weitere',
  phase: 15,
}

export type * from './types'
