/**
 * Öffentliche Schnittstelle des Moduls «Wartungsverträge».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'contracts',
  titel: { de: 'Wartungsverträge', fr: 'Contrats d’entretien' },
  untertitel: { de: 'Wiederkehrende Wartung und Abos', fr: 'Entretien récurrent et abonnements' },
  pfad: '/contracts',
  icon: 'file-signature',
  gruppe: 'abwicklung',
  phase: 9,
}

export type * from './types'
