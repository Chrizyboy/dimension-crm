/**
 * Öffentliche Schnittstelle des Moduls «Spesen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'expenses',
  titel: { de: 'Spesen', fr: 'Frais' },
  untertitel: { de: 'Belege fotografieren und abrechnen', fr: 'Photographier et décompter les justificatifs' },
  pfad: '/expenses',
  icon: 'wallet',
  gruppe: 'verwaltung',
  phase: 10,
}

export type * from './types'
