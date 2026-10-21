/**
 * Öffentliche Schnittstelle des Moduls «Ausschreibungen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'tenders',
  titel: { de: 'Ausschreibungen', fr: "Appels d'offres" },
  pfad: '/tenders',
  icon: 'gavel',
  gruppe: 'verkauf',
  phase: '8b',
}

export type * from './types'
