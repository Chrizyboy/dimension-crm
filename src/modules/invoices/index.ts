/**
 * Öffentliche Schnittstelle des Moduls «Rechnungen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'invoices',
  titel: { de: 'Rechnungen', fr: 'Factures' },
  untertitel: {
    de: 'Rechnungen stellen, Zahlungen verbuchen, mahnen, Abgleich mit AbaNinja',
    fr: 'Émettre des factures, saisir les paiements, rappels, synchronisation AbaNinja',
  },
  pfad: '/invoices',
  icon: 'receipt',
  gruppe: 'abwicklung',
  phase: 10,
  recht: 'finanzen',
}

/** Die Seite: Rechnungen, zu verrechnen, Firmenangaben. */
export const Rechnungen = lazy(() => import('./components/Rechnungen'))

export { REITER } from './types'
export type * from './types'
