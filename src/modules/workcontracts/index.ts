/**
 * Öffentliche Schnittstelle des Moduls «Werkverträge».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'workcontracts',
  titel: { de: 'Werkverträge', fr: 'Contrats d’entreprise' },
  untertitel: {
    de: 'Vertrag zur angenommenen Offerte erstellen, senden, unterschreiben lassen',
    fr: 'Établir, envoyer et faire signer le contrat de l’offre acceptée',
  },
  pfad: '/workcontracts',
  icon: 'signature',
  gruppe: 'verkauf',
  phase: 7,
}

export type * from './types'
