import { formatDatum } from '@/lib/format'
import type { Werbekampagne } from '../types'

/** Zeitraum «20.11.2026 – 22.11.2026» oder nur der Start. */
export function zeitraum(k: Pick<Werbekampagne, 'start_am' | 'ende_am'>): string {
  if (!k.start_am) return '–'
  return k.ende_am && k.ende_am !== k.start_am
    ? `${formatDatum(k.start_am)} – ${formatDatum(k.ende_am)}`
    : formatDatum(k.start_am)
}
