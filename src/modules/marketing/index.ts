/**
 * Öffentliche Schnittstelle des Moduls «Marketing».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'marketing',
  titel: { de: 'Marketing', fr: 'Marketing' },
  untertitel: {
    de: 'Kampagnen und Messen planen, Kunden anschreiben, posten und sehen, was es bringt',
    fr: 'Planifier campagnes et salons, écrire aux clients, publier et voir ce que cela rapporte',
  },
  pfad: '/marketing',
  icon: 'megaphone',
  gruppe: 'akquise',
  phase: 11,
}

/** Die Seite mit den Reitern Kunden anschreiben, Social Media, Newsletter und Vorlagen. */
export const Marketing = lazy(() => import('./components/Marketing'))

export { ANSICHTEN } from './types'
export type * from './types'
