/**
 * Öffentliche Schnittstelle des Moduls «Service & Garantie».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'aftersales',
  titel: { de: 'Service & Garantie', fr: 'Service & garantie' },
  untertitel: { de: 'Störungen, Reklamationen und Nachkontrollen', fr: 'Pannes, réclamations et contrôles' },
  pfad: '/aftersales',
  icon: 'wrench',
  gruppe: 'abwicklung',
  phase: 9,
}

/** Die Seite: Reiter Fälle und Anlagen; Fall-Akte als Seitenpanel. */
export const Service = lazy(() => import('./components/Service'))

/** Karte für die Startseite: offene und dringende Fälle, fällige Kontrollen. */
export const ServiceHeute = lazy(() => import('./components/HeuteKarte'))

export { REITER } from './types'
export type * from './types'
