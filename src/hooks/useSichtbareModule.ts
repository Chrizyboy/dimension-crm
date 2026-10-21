import { useMemo } from 'react'
import { MODULE } from '@/lib/navigation'
import { darfModul } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import type { ModulMeta } from '@/types/modul'

/**
 * Bereiche, die die angemeldete Person sehen darf, in Seitenleisten-Reihenfolge.
 * Seitenleiste, Handy-Leiste, Befehlspalette und Startseite nutzen alle diese eine Liste.
 */
export function useSichtbareModule(): ModulMeta[] {
  const ich = useAnmeldung((z) => z.ich)
  return useMemo(() => MODULE.filter((m) => darfModul(m, ich)), [ich])
}
