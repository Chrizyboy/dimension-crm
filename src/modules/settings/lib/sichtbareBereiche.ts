import type { ModulMeta } from '@/types/modul'
import type { Person, Rolle } from '../types'

/** Bereiche, die man pro Person oder Rolle an- und abwählen kann (nicht «immer», keine System-Bereiche). */
export function waehlbareBereiche(module: readonly ModulMeta[]): ModulMeta[] {
  return module.filter(
    (m) => !m.immer && !(m.recht === 'admin' || (Array.isArray(m.recht) && m.recht.includes('admin'))),
  )
}

/** Sieht die Person ohnehin alles? Nur die Administration (Zusatz an der Person oder an der Rolle), nicht mehr «gl». */
export function siehtAlles(p: Person, rolle: Rolle | undefined): boolean {
  return p.rechte.includes('admin') || (rolle?.rechte.includes('admin') ?? false)
}

/**
 * Welche Bereiche die Person sieht und woher: eigene Auswahl an der Person, sonst die der Rolle, sonst keine
 * (nur Mein Tag, bis jemand freigibt).
 * Gleiche Regel wie `meine_anmeldung` in der Datenbank.
 */
export function wirksameBereiche(
  p: Person,
  rolle: Rolle | undefined,
  alle: readonly string[],
): { bereiche: string[]; quelle: 'person' | 'rolle' | 'alle' | 'keine' } {
  if (siehtAlles(p, rolle)) return { bereiche: [...alle], quelle: 'alle' }
  if (p.bereiche.length > 0) return { bereiche: p.bereiche, quelle: 'person' }
  if (rolle?.bereiche.length) return { bereiche: rolle.bereiche, quelle: 'rolle' }
  return { bereiche: [], quelle: 'keine' }
}

/** Neue eigene Auswahl nach einem Häkchen; ab dem ersten Häkchen weicht die Person von ihrer Rolle ab. */
export function umschalten(aktuell: readonly string[], bereich: string, an: boolean): string[] {
  return an ? [...new Set([...aktuell, bereich])] : aktuell.filter((b) => b !== bereich)
}
