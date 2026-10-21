/**
 * Öffentliche Schnittstelle des Moduls «Verkauf».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'sales',
  titel: { de: 'Verkauf', fr: 'Vente' },
  pfad: '/sales',
  icon: 'users',
  gruppe: 'verkauf',
  phase: 6,
}

export type * from './types'
