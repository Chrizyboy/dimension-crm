/**
 * Öffentliche Schnittstelle des Moduls «Kennzahlen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'dashboard',
  titel: { de: 'Kennzahlen', fr: 'Indicateurs' },
  untertitel: {
    de: 'Verkauf, Pipeline, Aufträge und Auslastung auf einen Blick',
    fr: 'Vente, pipeline, commandes et charge en un coup d’œil',
  },
  pfad: '/dashboard',
  icon: 'chart-column',
  gruppe: 'uebersicht',
  phase: 14,
}

/** Die Seite «Kennzahlen» mit Reitern Verkauf, Pipeline, Aufträge und Auslastung. */
export const Kennzahlen = lazy(() => import('./components/Kennzahlen'))

export { BEREICHE, KENNZAHLEN_REITER, ZEITRAEUME } from './types'
export type * from './types'
