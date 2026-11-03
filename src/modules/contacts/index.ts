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
    de: 'Geschäftspartner: Netzbetreiber, Lieferanten, Subunternehmer, Gemeinden und mehr',
    fr: 'Partenaires : gestionnaires de réseau, fournisseurs, sous-traitants, communes et plus',
  },
  pfad: '/contacts',
  icon: 'book-user',
  gruppe: 'verkauf',
  phase: 5,
}

/** Liste der Geschäftspartner mit Rollen, Zahlen, «auch Kunden zeigen» und Papierkorb. */
export const Adressbuch = lazy(() => import('./components/Adressbuch'))
/** Akte eines Partners als ganze Seite (Steckbrief je Rolle, Ansprechpersonen, Nachweise, Gesuche, Aufträge). */
export const PartnerSeite = lazy(() => import('./components/PartnerSeite'))
/** «Neuer Eintrag» mit Vorschlag aus dem UID-Register und Warnung vor Doppelten. */
export const NeuerPartner = lazy(() => import('./components/NeuerPartner'))

export type * from './types'
