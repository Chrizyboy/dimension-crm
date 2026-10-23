/**
 * Öffentliche Schnittstelle des Moduls «Finanzen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'finance',
  titel: { de: 'Finanzen', fr: 'Finances' },
  untertitel: {
    de: 'Liquidität Woche für Woche, Zahlungen, Fixkosten und Nachkalkulation',
    fr: 'Liquidités semaine par semaine, paiements, frais fixes et post-calcul',
  },
  pfad: '/finance',
  icon: 'landmark',
  gruppe: 'verwaltung',
  phase: 10,
  recht: 'finanzen',
}

/** Die Seite mit allen Reitern. */
export const Finanzen = lazy(() => import('./components/Finanzen'))

/** Karte für die Startseite: Kontostand, tiefster Stand, diese Woche fällig. */
export const FinanzenHeute = lazy(() => import('./components/HeuteKarte'))

export { REITER } from './types'
export type * from './types'
