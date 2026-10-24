/**
 * Öffentliche Schnittstelle des Moduls «KI-Assistent».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'ai',
  titel: { de: 'KI-Assistent', fr: 'Assistant IA' },
  untertitel: {
    de: 'Texte entwerfen, Mails lesen, Kosten im Blick',
    fr: 'Rédiger, lire les e-mails, suivre les coûts',
  },
  pfad: '/ai',
  icon: 'sparkles',
  gruppe: 'weitere',
  phase: 13,
}

/** Die Seite mit den Reitern Assistent, Kosten, Mein Schreibstil und Einstellungen. */
export const KiSeite = lazy(() => import('./components/KiSeite'))

/** Tagesbriefing für die Startseite («Heute»). */
export const KiBriefing = lazy(() => import('./components/Briefing'))

export { ANSICHTEN } from './types'
export type * from './types'
