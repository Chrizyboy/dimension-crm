/**
 * Öffentliche Schnittstelle des Moduls «Offerten».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'quotes',
  titel: { de: 'Offerten', fr: 'Offres' },
  untertitel: { de: 'Kalkulation, Preise, Versionen und PDF', fr: 'Calcul, prix, versions et PDF' },
  pfad: '/quotes',
  icon: 'file-text',
  gruppe: 'verkauf',
  phase: 7,
}

export type * from './types'
