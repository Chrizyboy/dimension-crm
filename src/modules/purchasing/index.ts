/**
 * Öffentliche Schnittstelle des Moduls «Einkauf & Material».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'purchasing',
  titel: { de: 'Einkauf & Material', fr: 'Achats & matériel' },
  untertitel: {
    de: 'Material bei Lieferanten bestellen, Liefertermine, Wareneingang, Lager',
    fr: 'Commander le matériel, délais de livraison, réception, stock',
  },
  pfad: '/purchasing',
  icon: 'package',
  gruppe: 'abwicklung',
  phase: '9a',
}

/** Die Seite: Bestellungen, Material je Projekt, Lager, Lieferanten. */
export const Einkauf = lazy(() => import('./components/Einkauf'))

/** Karte für die Startseite: freizugeben, überfällig, Lager unter Minimum. */
export const EinkaufHeute = lazy(() => import('./components/HeuteKarte'))

export { REITER } from './types'
export type * from './types'
