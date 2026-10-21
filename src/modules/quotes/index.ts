/**
 * Öffentliche Schnittstelle des Moduls «Offerten».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'quotes',
  titel: { de: 'Offerten', fr: 'Offres' },
  untertitel: {
    de: 'Offerten schreiben, versenden, nachfassen und überarbeiten',
    fr: 'Rédiger, envoyer, relancer et réviser les offres',
  },
  pfad: '/quotes',
  icon: 'file-text',
  gruppe: 'verkauf',
  phase: 7,
}

/** Der ganze Bereich: Neue Offerten, Offerten Muri und Bulle, Nachfassen, PDF-Import. */
export const Offerten = lazy(() => import('./components/Offerten'))

export { OFFERT_ANSICHTEN } from './types'
export type * from './types'
