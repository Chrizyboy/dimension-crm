/**
 * Öffentliche Schnittstelle des Moduls «Zeiterfassung».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import { lazy } from 'react'
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'time',
  titel: { de: 'Zeiterfassung', fr: 'Saisie du temps' },
  untertitel: {
    de: 'Arbeitszeit stempeln, Saldo und Ferienkonto sehen, Ferien und Abwesenheiten beantragen und bewilligen',
    fr: 'Pointer le temps de travail, voir solde et vacances, demander et valider vacances et absences',
  },
  pfad: '/time',
  icon: 'clock',
  gruppe: 'betrieb',
  phase: 19,
  // Jede Person erfasst ihre eigene Zeit; was sie sieht, entscheidet die Datenbank.
  immer: true,
}

/** Die Seite: Meine Zeit, Abwesenheiten und (für die Zeit-Leitung) Team. */
export const Zeiterfassung = lazy(() => import('./components/Zeiterfassung'))

export { einstellungen } from './einstellungen'
export { REITER } from './types'
export type * from './types'
