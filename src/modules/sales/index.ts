/**
 * Öffentliche Schnittstelle des Moduls «Anfragen & Leads».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'sales',
  titel: { de: 'Anfragen & Leads', fr: 'Demandes & leads' },
  kurztitel: { de: 'Anfragen', fr: 'Demandes' },
  untertitel: { de: 'Vom ersten Kontakt bis zur Auftragszusage', fr: 'Du premier contact à la commande' },
  pfad: '/sales',
  icon: 'users',
  gruppe: 'verkauf',
  phase: 6,
}

/** Der ganze Bereich: Pipeline, Liste, Tagesroute, Tour, Kalender, Regionen, Monatsbericht. */
export const Verkauf = lazy(() => import('./components/Verkauf'))

export { VERKAUF_ANSICHTEN } from './types'
export type * from './types'
