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
    de: 'Wer darf was: Kurse, Ausweise und Personal-Akte',
    fr: 'Qui peut faire quoi : cours, permis et dossier du personnel',
  },
  pfad: '/staff',
  icon: 'id-card',
  gruppe: 'verwaltung',
  phase: 17,
  immer: true,
}

/** Die Seite: Übersicht «wer darf was» und Person mit Ausweisen und Akte. */
export const Team = lazy(() => import('./components/Team'))

export type * from './types'
