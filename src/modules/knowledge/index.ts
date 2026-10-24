/**
 * Öffentliche Schnittstelle des Moduls «Handbuch».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. Das Handbuch sehen alle. */
export const meta: ModulMeta = {
  id: 'knowledge',
  titel: { de: 'Handbuch', fr: 'Manuel' },
  untertitel: { de: 'Anleitungen, Vorlagen und Know-how', fr: 'Guides, modèles et savoir-faire' },
  pfad: '/knowledge',
  icon: 'book-open',
  gruppe: 'weitere',
  phase: 15,
  immer: true,
}

/** Die Seite: Anleitung, Prozesse, Videos und Meldungen. */
export const Handbuch = lazy(() => import('./components/Handbuch'))

export { ANSICHTEN } from './types'
export type * from './types'
