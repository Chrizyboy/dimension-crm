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
  untertitel: {
    de: 'Personen, Firma, Listen, Abläufe und Verbindungen an einem Ort',
    fr: 'Personnes, entreprise, listes, processus et connexions au même endroit',
  },
  pfad: '/settings',
  icon: 'settings',
  gruppe: 'verwaltung',
  phase: 4,
  recht: ['admin', 'gl'],
}

/**
 * Seiten des Moduls, erst beim Öffnen geladen. So zieht die Navigation (die alle index.ts liest)
 * nicht den Code jeder Seite in den Start der App.
 */
export const MeinKonto = lazy(() => import('./components/MeinKonto'))
export const Einstellungen = lazy(() => import('./components/Einstellungen'))

/** Bereiche dieses Moduls für die Einstellungs-Seite (die Route ergänzt die der anderen Module). */
export { eigeneBereiche } from './bereiche'
export { ALTE_REITER } from './lib/bereiche'

export type * from './types'
