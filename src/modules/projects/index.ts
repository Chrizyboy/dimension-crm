/**
 * Öffentliche Schnittstelle des Moduls «Projekte & Montage».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
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

/** Die Seite: Baustellen, Zeitplan, Bewilligungen, Alle, Subunternehmer, Abwesenheiten; Akte als Seitenpanel. */
export const Projekte = lazy(() => import('./components/Projekte'))

/** Karte für die Startseite: wer heute auf dem Bau ist, Baustellen ohne Termin, überfällige Bewilligungen. */
export const ProjekteHeute = lazy(() => import('./components/HeuteKarte'))

export { AKTE_REITER, REITER } from './types'
export type * from './types'
