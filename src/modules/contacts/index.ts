/**
 * Öffentliche Schnittstelle des Moduls «Adressbuch».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'contacts',
  titel: { de: 'Adressbuch', fr: 'Carnet d’adresses' },
  untertitel: {
    de: 'Alle Personen, auch Partner und Lieferanten',
    fr: 'Toutes les personnes, partenaires et fournisseurs inclus',
  },
  pfad: '/contacts',
  icon: 'book-user',
  gruppe: 'verkauf',
  phase: 5,
}

/** Liste aller Kontakte mit Filter nach Art und Papierkorb. */
export const Adressbuch = lazy(() => import('./components/Adressbuch'))

export type * from './types'
