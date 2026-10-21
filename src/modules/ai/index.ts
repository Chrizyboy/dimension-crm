/**
 * Öffentliche Schnittstelle des Moduls «Assistent».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'ai',
  titel: { de: 'Assistent', fr: 'Assistant' },
  pfad: '/ai',
  icon: 'sparkles',
  gruppe: 'weitere',
  phase: 13,
}

export type * from './types'
