/**
 * Öffentliche Schnittstelle des Moduls «Anfragen & Leads».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'sales',
  titel: { de: 'Anfragen & Leads', fr: 'Demandes & leads' },
  untertitel: { de: 'Vom ersten Kontakt bis zur Auftragszusage', fr: 'Du premier contact à la commande' },
  pfad: '/sales',
  icon: 'users',
  gruppe: 'verkauf',
  phase: 6,
}

export type * from './types'
