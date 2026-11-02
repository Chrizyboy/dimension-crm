/**
 * Öffentliche Schnittstelle des Moduls «Assistent» (früher «KI-Assistent»).
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'ai',
  titel: { de: 'Assistent', fr: 'Assistant' },
  untertitel: {
    de: 'Fragen ans CRM, Aufträge, Dokumente lesen, Texte entwerfen',
    fr: 'Questions au CRM, tâches, lire des documents, rédiger',
  },
  pfad: '/ai',
  icon: 'sparkles',
  gruppe: 'weitere',
  phase: 13,
}

/** Die Seite mit den Reitern Fragen, Aufträge, Dokument, Verlauf, Im CRM, Kosten, Schreibstil, Einstellungen. */
export const KiSeite = lazy(() => import('./components/KiSeite'))

/** Tagesbriefing für die Startseite («Heute»). */
export const KiBriefing = lazy(() => import('./components/Briefing'))

/** Assistent überall (Ctrl J), mit dem offenen Datensatz als Bezug; im App-Rahmen eingehängt. */
export const AssistentFenster = lazy(() => import('./components/AssistentFenster'))

export { ANSICHTEN } from './types'
export type * from './types'
