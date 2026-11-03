/** Liste der Inspektionen (ohne React, darum testbar). */
import type { Vertrag } from '../types'
import { inTagen } from './anzeige'

export const INSPEKTION_FILTER = ['offen', 'geplant', 'alle'] as const
export type InspektionFilter = (typeof INSPEKTION_FILTER)[number]

/** Tag des Termins oder, ohne Termin, die Fälligkeit (JJJJ-MM-TT) – danach wird sortiert. */
export function inspektionTag(v: Vertrag): string {
  return v.termin_von ? inTagen(new Date(v.termin_von), 0) : (v.naechste_wartung ?? '9999-12-31')
}

/**
 * Inspektionen zum Planen: aktive Verträge mit Inspektion, fällig innert `tage` Tagen (oder überfällig) oder schon
 * geplant. `offen` = noch ohne Termin, `geplant` = mit Termin.
 */
export function inspektionen(liste: Vertrag[], heute: Date, filter: InspektionFilter, tage = 90): Vertrag[] {
  const bis = inTagen(heute, tage)
  return liste
    .filter((v) => v.status === 'aktiv' && v.naechste_wartung != null)
    .filter((v) => v.termin_von != null || (v.naechste_wartung ?? '9999') <= bis)
    .filter((v) => filter === 'alle' || (filter === 'offen' ? !v.termin_von : Boolean(v.termin_von)))
    .sort((a, b) => inspektionTag(a).localeCompare(inspektionTag(b)))
}

/** Zahlen über der Liste: fällig ohne Termin, geplant, davon angekündigt. */
export function inspektionZahlen(liste: Vertrag[], heute: Date, tage = 90) {
  const alle = inspektionen(liste, heute, 'alle', tage)
  return {
    offen: alle.filter((v) => !v.termin_von).length,
    geplant: alle.filter((v) => v.termin_von).length,
    angekuendigt: alle.filter((v) => v.angekuendigt_am).length,
  }
}
