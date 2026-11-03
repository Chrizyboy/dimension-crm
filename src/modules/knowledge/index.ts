/**
 * Öffentliche Schnittstelle des Moduls «Handbuch».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. Das Handbuch sehen alle. */
export const meta: ModulMeta = {
  id: 'knowledge',
  titel: { de: 'Handbuch', fr: 'Manuel' },
  untertitel: {
    de: 'Wie alles funktioniert: ein Kapitel pro Bereich, Prozesse, Videos und Hilfe',
    fr: 'Comment tout fonctionne : un chapitre par domaine, processus, vidéos et aide',
  },
  pfad: '/knowledge',
  icon: 'book-open',
  gruppe: 'weitere',
  phase: 15,
  immer: true,
}

/** Die Seite: Für dich, Kapitel, Erste Schritte, Prozesse, Videos, Begriffe, Neu und Meldungen. */
export const Handbuch = lazy(() => import('./components/Handbuch'))

/** Hilfe im Bereich (F1): das Kapitel des aktuellen Bereichs als Seitenblatt. */
export const HilfePanel = lazy(() => import('./components/HilfePanel'))

export { ANSICHTEN } from './types'
export type * from './types'
