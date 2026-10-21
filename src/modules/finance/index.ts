/**
 * Öffentliche Schnittstelle des Moduls «Finanzen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'finance',
  titel: { de: 'Finanzen', fr: 'Finances' },
  untertitel: { de: 'Liquidität, Budget und Auswertungen', fr: 'Liquidités, budget et analyses' },
  pfad: '/finance',
  icon: 'landmark',
  gruppe: 'verwaltung',
  phase: 10,
}

export type * from './types'
