/**
 * Öffentliche Schnittstelle des Moduls «Team & Ausweise».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. Für alle sichtbar (eigene Ausweise und Akte). */
export const meta: ModulMeta = {
  id: 'staff',
  titel: { de: 'Team & Ausweise', fr: 'Équipe & certificats' },
  untertitel: {
    de: 'Wer ist heute wo, wer darf was: Team, Ausweise, Kurse und Personal-Akte',
    fr: 'Qui est où aujourd’hui, qui peut faire quoi : équipe, permis, cours et dossier du personnel',
  },
  pfad: '/staff',
  icon: 'id-card',
  gruppe: 'verwaltung',
  phase: 17,
  immer: true,
}

/** Die Seite: Team, Ausweise, Kurse, Anforderungen und Person mit Ausweisen, Kursen, Ausrüstung und Akte. */
export const Team = lazy(() => import('./components/Team'))

/** Karte für «Mein Tag»: Geburtstage und Dienstjubiläen der nächsten Tage (ohne Jahrgang, abschaltbar). */
export const TeamHeute = lazy(() => import('./components/HeuteKarte'))

export type * from './types'
export { REITER } from './types'
