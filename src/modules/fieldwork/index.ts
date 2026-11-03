/**
 * Öffentliche Schnittstelle des Moduls «Baustelle & Rapporte».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'fieldwork',
  titel: { de: 'Baustelle & Rapporte', fr: 'Chantier & rapports' },
  kurztitel: { de: 'Baustelle', fr: 'Chantier' },
  untertitel: {
    de: 'Montage am Handy mit Rapport, Teamzeit und Fotos; Baustellen, Meldungen und Auswertung für die Leitung',
    fr: 'Montage sur mobile avec rapport, temps d’équipe et photos ; chantiers, signalements et analyse pour la direction',
  },
  pfad: '/fieldwork',
  icon: 'clipboard-check',
  gruppe: 'abwicklung',
  phase: '9b',
}

/** Die Seite: Mein Tag (Handy), Rapporte, Zeiten, Nachträge; Rapport als Seitenpanel. */
export const Baustelle = lazy(() => import('./components/Baustelle'))

/** Karte für die Startseite: Einsätze heute, offene Rapporte, Nachträge zum Prüfen. */
export const BaustelleHeute = lazy(() => import('./components/HeuteKarte'))

/** Stempeluhr für die einfache Monteur-Ansicht: Arbeit/Reise starten und stoppen, Summen heute und Woche. */
export const Stempeluhr = lazy(() => import('./components/Stempeluhr'))

/** «Mein Plan» für die einfache Monteur-Ansicht: Baustellen und Abwesenheiten der nächsten zwei Wochen. */
export const MeinPlan = lazy(() => import('./components/MeinPlan'))

export { REITER } from './types'
export type * from './types'
