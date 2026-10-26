/**
 * Öffentliche Schnittstelle des Moduls «Fahrzeuge & Geräte».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'fleet',
  titel: { de: 'Fahrzeuge & Geräte', fr: 'Véhicules & appareils' },
  untertitel: {
    de: 'MFK, Service, Geräteprüfungen und wer was hat',
    fr: 'Expertise, service, contrôles des appareils et qui a quoi',
  },
  pfad: '/fleet',
  icon: 'truck',
  gruppe: 'abwicklung',
  phase: 17,
}

/** Die Seite: Fahrzeuge, Geräte, Fristen. */
export const Fuhrpark = lazy(() => import('./components/Fuhrpark'))

/** Karte für die Startseite: anstehende Fristen. */
export const FristenHeute = lazy(() => import('./components/HeuteKarte'))

export { ANSICHTEN } from './types'
export type * from './types'
export type { FuhrparkZiel } from './components/Fuhrpark'
