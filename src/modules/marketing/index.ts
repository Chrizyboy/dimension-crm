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
    de: 'Kunden anschreiben, Social Media und Newsletter',
    fr: 'Écrire aux clients, réseaux sociaux et newsletter',
  },
  pfad: '/marketing',
  icon: 'megaphone',
  gruppe: 'verkauf',
  phase: 11,
}

/** Die Seite mit den Reitern Kunden anschreiben, Social Media, Newsletter und Vorlagen. */
export const Marketing = lazy(() => import('./components/Marketing'))

export { ANSICHTEN } from './types'
export type * from './types'
