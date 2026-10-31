/**
 * Öffentliche Schnittstelle des Moduls «Posteingang».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'inbox',
  titel: { de: 'Posteingang', fr: 'Boîte de réception' },
  untertitel: {
    de: 'Alle Mails geordnet: wer wartet auf uns und was gehört wohin',
    fr: 'Tous les e-mails triés : qui attend une réponse et où classer quoi',
  },
  pfad: '/inbox',
  icon: 'inbox',
  gruppe: 'uebersicht',
  phase: 18,
}

/** Die Seite: Posteingang, Reaktionszeit, Einstellungen; Mail als Seitenpanel. */
export const Posteingang = lazy(() => import('./components/Posteingang'))

/** Karte für «Mein Tag»: wer auf eine Antwort von mir (oder vom Team) wartet. */
export const PosteingangHeute = lazy(() => import('./components/HeuteKarte'))

export { ANSICHTEN, REITER } from './types'
export type { Ansicht, Reiter } from './types'
export type { PosteingangZiel } from './components/Posteingang'
