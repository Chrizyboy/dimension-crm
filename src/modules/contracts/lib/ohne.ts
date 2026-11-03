/** Filter der eigenen Anlagen ohne Wartungsvertrag (ohne React, darum testbar). */
import type { OhneVertrag } from '../types'
import { inTagen } from './anzeige'

export const OHNE_FILTER = ['nie', 'nachfassen', 'alle'] as const
export type OhneFilter = (typeof OHNE_FILTER)[number]

/** Nach so vielen Tagen ohne Antwort ist ein Angebot «nachzufassen». */
export const NACHFASSEN_TAGE = 14

/**
 * `nie` = noch nie angeboten, `nachfassen` = Angebot offen und älter als 14 Tage, `alle` = auch abgelehnte und
 * frisch angebotene.
 */
export function ohneFiltern(liste: OhneVertrag[], filter: OhneFilter, heute: Date): OhneVertrag[] {
  const grenze = inTagen(heute, -NACHFASSEN_TAGE)
  if (filter === 'nie') return liste.filter((z) => !z.angebot_am)
  if (filter === 'nachfassen') {
    return liste.filter(
      (z) => z.angebot_stand === 'offen' && z.angebot_am != null && z.angebot_am.slice(0, 10) <= grenze,
    )
  }
  return liste
}
