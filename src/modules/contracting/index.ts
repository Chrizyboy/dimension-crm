/**
 * Öffentliche Schnittstelle des Moduls «Grossprojekte» (Contracting-Monitor).
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'contracting',
  titel: { de: 'Grossprojekte', fr: 'Grands projets' },
  untertitel: {
    de: 'Grosse Dächer und Heizungen finden, die sich für Contracting lohnen',
    fr: 'Trouver les grands toits et chauffages qui se prêtent au contracting',
  },
  pfad: '/contracting',
  icon: 'building-2',
  gruppe: 'verkauf',
  phase: '8c',
}

/** Die Seite: Prüfen, Beobachten, Bewilligt, Alle, Annahmen; Akte als Seitenpanel. */
export const Grossprojekte = lazy(() => import('./components/Grossprojekte'))

/** Karte für «Mein Tag»: die besten Grossprojekte, die einen Entscheid brauchen. */
export const GrossprojekteHeute = lazy(() => import('./components/HeuteKarte'))

export { ANSICHTEN } from './types'
export type * from './types'
export type { GrossprojekteZiel } from './components/Grossprojekte'
