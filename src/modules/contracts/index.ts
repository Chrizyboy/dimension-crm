/**
 * Öffentliche Schnittstelle des Moduls «Verträge».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'contracts',
  titel: { de: 'Verträge', fr: 'Contrats' },
  pfad: '/contracts',
  icon: 'file-signature',
  gruppe: 'abwicklung',
  phase: 9,
}

export type * from './types'
