/**
 * Öffentliche Schnittstelle des Moduls «Kennzahlen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'dashboard',
  titel: { de: 'Kennzahlen', fr: 'Indicateurs' },
  untertitel: { de: 'Umsatz, Pipeline und Ziele auf einen Blick', fr: 'Chiffre d’affaires, pipeline et objectifs' },
  pfad: '/dashboard',
  icon: 'chart-column',
  gruppe: 'uebersicht',
  phase: 14,
}

export type * from './types'
