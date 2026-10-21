/**
 * Öffentliche Schnittstelle des Moduls «KI-Assistent».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'ai',
  titel: { de: 'KI-Assistent', fr: 'Assistant IA' },
  untertitel: { de: 'Fragen stellen, Texte entwerfen, auswerten', fr: 'Poser des questions, rédiger, analyser' },
  pfad: '/ai',
  icon: 'sparkles',
  gruppe: 'weitere',
  phase: 13,
}

export type * from './types'
