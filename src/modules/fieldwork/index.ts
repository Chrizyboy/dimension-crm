/**
 * Öffentliche Schnittstelle des Moduls «Baustelle & Rapporte».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: 'fieldwork',
  titel: { de: 'Baustelle & Rapporte', fr: 'Chantier & rapports' },
  // Ein Satz, was man hier erledigt. Erscheint als Hinweis in Seitenleiste, Suche und Seitenkopf.
  untertitel: {
    de: 'Am Handy für Monteure: Rapport, Zeiterfassung, Nachträge, IBN-Protokoll',
    fr: 'Sur mobile pour les monteurs : rapport, saisie du temps, avenants, protocole MES',
  },
  pfad: '/fieldwork',
  icon: 'clipboard-check',
  gruppe: 'abwicklung',
  phase: '9b',
}

export type * from './types'
