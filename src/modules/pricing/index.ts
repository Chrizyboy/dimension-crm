/**
 * Öffentliche Schnittstelle des Moduls «Preise».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'pricing',
  titel: { de: 'Preise', fr: 'Prix' },
  untertitel: {
    de: 'Preisliste, Kalkulation und Preise für Kunden',
    fr: 'Liste de prix, calcul et prix pour les clients',
  },
  pfad: '/pricing',
  icon: 'tag',
  gruppe: 'verkauf',
  phase: 7,
}

/** Der ganze Bereich: Preisliste, Archiv, Kundenansicht und Kalkulation. */
export const Preise = lazy(() => import('./components/Preise'))

export { PREIS_ANSICHTEN } from './types'
export type * from './types'
