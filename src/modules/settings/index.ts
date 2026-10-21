/**
 * Öffentliche Schnittstelle des Moduls «Einstellungen».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'settings',
  titel: { de: 'Einstellungen', fr: 'Paramètres' },
  untertitel: { de: 'Benutzer, Rollen, Vorlagen und Verbindungen', fr: 'Utilisateurs, rôles, modèles et connexions' },
  pfad: '/settings',
  icon: 'settings',
  gruppe: 'verwaltung',
  phase: 4,
  recht: 'admin',
}

/**
 * Seiten des Moduls, erst beim Öffnen geladen. So zieht die Navigation (die alle index.ts liest)
 * nicht den Code jeder Seite in den Start der App.
 */
export const MeinKonto = lazy(() => import('./components/MeinKonto'))
export const Benutzerverwaltung = lazy(() => import('./components/Benutzerverwaltung'))

export type * from './types'
