import type { BadgeProps } from '@/components/ui/badge'
import type { EingangStatus, Rechnung } from '../types'

/** Farbe des Stands; überfällige Rechnungen sind immer rot. */
export function statusTon(r: Pick<Rechnung, 'status' | 'ueberfaellig'>): NonNullable<BadgeProps['ton']> {
  if (r.ueberfaellig) return 'kritisch'
  switch (r.status) {
    case 'bezahlt':
      return 'ok'
    case 'teilbezahlt':
      return 'warnung'
    case 'gestellt':
      return 'info'
    default:
      return 'neutral'
  }
}

/** Farbe je Stand: wartet auf Visum = Hinweis, bereit = Warnung (jetzt zahlen), abgelehnt = rot. */
export function eingangTon(s: EingangStatus): NonNullable<BadgeProps['ton']> {
  if (s === 'bereit') return 'warnung'
  if (s === 'bezahlt') return 'ok'
  if (s === 'abgelehnt') return 'kritisch'
  if (s === 'visum_pl' || s === 'visum_gl') return 'info'
  return 'neutral'
}
