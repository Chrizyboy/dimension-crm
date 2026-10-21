/**
 * Öffentliche Schnittstelle des Moduls «Rechnungen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'invoices',
  titel: { de: 'Rechnungen', fr: 'Factures' },
  pfad: '/invoices',
  icon: 'receipt',
  gruppe: 'abwicklung',
  phase: 10,
}

export type * from './types'
