/**
 * Öffentliche Schnittstelle des Moduls «Kunden».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'customers',
  titel: { de: 'Kunden', fr: 'Clients' },
  untertitel: { de: 'Haushalte und Firmen mit ihren Gebäuden', fr: 'Ménages et entreprises avec leurs bâtiments' },
  pfad: '/customers',
  icon: 'contact',
  gruppe: 'verkauf',
  phase: 5,
}

/** Kundenliste mit Suche, Stand-Filter und offener Kundenakte. */
export const Kunden = lazy(() => import('./components/Kunden'))
/** Die 360°-Kundenakte als Seitenpanel; auch das Adressbuch öffnet Kontakte damit. */
export const Kundenakte = lazy(() => import('./components/Kundenakte'))
/** Kontakt anlegen oder ändern, mit Dublettenprüfung. */
export const KontaktDialog = lazy(() => import('./components/KontaktDialog'))

export type * from './types'
