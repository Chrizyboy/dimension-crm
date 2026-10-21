/**
 * Öffentliche Schnittstelle des Moduls «Projekte & Montage».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'projects',
  titel: { de: 'Projekte & Montage', fr: 'Projets & montage' },
  untertitel: { de: 'Vom Auftrag bis zur Inbetriebnahme', fr: 'De la commande à la mise en service' },
  pfad: '/projects',
  icon: 'hard-hat',
  gruppe: 'abwicklung',
  phase: 9,
}

export type * from './types'
