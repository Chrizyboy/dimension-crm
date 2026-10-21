/**
 * Öffentliche Schnittstelle des Moduls «__TITEL__».
 * Andere Teile des CRM dürfen NUR von hier importieren, nie direkt aus Unterordnern.
 */
import type { ModulMeta } from '@/types/modul'

/** Kenndaten für Navigation, Berechtigungen und Befehlspalette. */
export const meta: ModulMeta = {
  id: '__MODUL__',
  titel: { de: '__TITEL__', fr: '__TITEL_FR__' },
  // Ein Satz, was man hier erledigt. Erscheint als Hinweis in Seitenleiste, Suche und Seitenkopf.
  untertitel: { de: '', fr: '' },
  pfad: '/__MODUL__',
  icon: '__ICON__',
  gruppe: '__GRUPPE__',
  phase: __PHASE_WERT__,
}

export type * from './types'
