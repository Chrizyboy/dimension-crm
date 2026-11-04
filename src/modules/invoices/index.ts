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
    de: 'Rechnungen stellen, Zahlungen verfolgen, mahnen, Lieferantenrechnungen visieren',
    fr: 'Émettre des factures, suivre les paiements, rappels, viser les factures fournisseurs',
  },
  pfad: '/invoices',
  icon: 'receipt',
  gruppe: 'finanzen',
  phase: 10,
  // Kein Recht nötig: Projektleitung und Verkauf sehen ihren Zahlungsstand und ihre Visa (Bereich in der Rolle).
}

/** Die Seite: Übersicht, Rechnungen, zu verrechnen, Mahnlauf, Eingangsrechnungen, Zahlungsstand, Firmenangaben. */
export const Rechnungen = lazy(() => import('./components/Rechnungen'))

/** Karte «Rechnungen zum Visum» für Mein Tag (Erstvisum der Projektleitung). */
export const VisumHeute = lazy(() => import('./components/VisumKarte'))

export { REITER } from './types'
export type * from './types'

/** Bereiche für Einstellungen (zentral). */
export { einstellungen } from './einstellungen'
