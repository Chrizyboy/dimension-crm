/**
 * Öffentliche Schnittstelle des Moduls «Spesen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. Spesen erfasst jede Person für sich. */
export const meta: ModulMeta = {
  id: 'expenses',
  titel: { de: 'Spesen', fr: 'Frais' },
  untertitel: { de: 'Belege fotografieren und abrechnen', fr: 'Photographier et décompter les justificatifs' },
  pfad: '/expenses',
  icon: 'wallet',
  gruppe: 'verwaltung',
  phase: 10,
}

/** Die Seite: meine Spesen, alle Spesen und Kategorien (Buchhaltung). */
export const Spesen = lazy(() => import('./components/Spesen'))

/** Karte für die Startseite: offene Spesen. */
export const SpesenHeute = lazy(() => import('./components/HeuteKarte'))

/** Spesen für die einfache Monteur-Ansicht: grosser Knopf «Spese erfassen» und die letzten eigenen Spesen. */
export const SpesenSchnell = lazy(() => import('./components/SpesenSchnell'))

export { ANSICHTEN } from './types'
export type * from './types'
