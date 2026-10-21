/**
 * Öffentliche Schnittstelle des Moduls «Bauplanung».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'projects',
  titel: { de: 'Bauplanung', fr: 'Chantiers' },
  pfad: '/projects',
  icon: 'hard-hat',
  gruppe: 'abwicklung',
  phase: 9,
}

export type * from './types'
