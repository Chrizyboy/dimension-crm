/**
 * Öffentliche Schnittstelle des Moduls «Marketing».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'marketing',
  titel: { de: 'Marketing', fr: 'Marketing' },
  untertitel: { de: 'Newsletter, Social Media und Kampagnen', fr: 'Newsletter, réseaux sociaux et campagnes' },
  pfad: '/marketing',
  icon: 'megaphone',
  gruppe: 'verkauf',
  phase: 11,
}

export type * from './types'
