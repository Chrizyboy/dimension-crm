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
    de: 'Preise aus Eturnity und Lieferanten pflegen, kalkulieren und Kunden einen Richtpreis geben',
    fr: "Gérer les prix d'Eturnity et des fournisseurs, calculer et donner un prix indicatif aux clients",
  },
  pfad: '/pricing',
  icon: 'tag',
  gruppe: 'verkauf',
  phase: 7,
}

/** Der ganze Bereich: Preisliste, Preisänderungen, Kalkulation, Leistungen & Regeln, Kundenansicht und Archiv. */
export const Preise = lazy(() => import('./components/Preise'))

export { PREIS_ANSICHTEN } from './types'
export type * from './types'
