import type { BadgeProps } from '@/components/ui/badge'
import type { Rechnung } from '../types'

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
