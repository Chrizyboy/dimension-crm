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
    de: 'Wie läuft es, wo hakt es, was kommt: Verkauf, Abwicklung, Finanzen und Service mit Ziel und Vorjahr',
    fr: 'Où en est-on, où ça coince, que vient-il : vente, réalisation, finances et service, avec objectif et an passé',
  },
  pfad: '/dashboard',
  icon: 'chart-column',
  gruppe: 'uebersicht',
  phase: 14,
}

/** Die Seite «Kennzahlen» mit Reitern Überblick, Verkauf, Pipeline, Abwicklung, Finanzen, Service, alle Zahlen. */
export const Kennzahlen = lazy(() => import('./components/Kennzahlen'))

export { BEREICHE, KENNZAHLEN_REITER, VERGLEICHE, ZEITRAEUME } from './types'
export { startReiter } from './lib/rolle'
export type * from './types'
