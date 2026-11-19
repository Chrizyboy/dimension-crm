import type { ModulMeta } from '@/types/modul'
import type { Person, Rolle } from '../types'

/** Bereiche, die man pro Person oder Rolle an- und abwählen kann (nicht «immer», keine System-Bereiche). */
export function waehlbareBereiche(module: readonly ModulMeta[]): ModulMeta[] {
  return module.filter(
    (m) => !m.immer && !(m.recht === 'admin' || (Array.isArray(m.recht) && m.recht.includes('admin'))),
  )
}

/** Sieht die Person mit «gl» ohnehin alles? (Zusatz an der Person oder an der Rolle) */
export function siehtAlles(p: Person, rolle: Rolle | undefined): boolean {
  return p.rechte.includes('gl') || (rolle?.rechte.includes('gl') ?? false)
}

/**
 * Welche Bereiche die Person sieht und woher: eigene Auswahl an der Person, sonst die der Rolle, leer = alle.
 * Gleiche Regel wie `meine_anmeldung` in der Datenbank.
 */
export function wirksameBereiche(
  p: Person,
  rolle: Rolle | undefined,
  alle: readonly string[],
): { bereiche: string[]; quelle: 'person' | 'rolle' | 'alle' } {
  if (siehtAlles(p, rolle)) return { bereiche: [...alle], quelle: 'alle' }
  if (p.bereiche.length > 0) return { bereiche: p.bereiche, quelle: 'person' }
  if (rolle?.bereiche.length) return { bereiche: rolle.bereiche, quelle: 'rolle' }
  return { bereiche: [...alle], quelle: 'alle' }
}

/** Neue eigene Auswahl nach einem Häkchen; ab dem ersten Häkchen weicht die Person von ihrer Rolle ab. */
export function umschalten(aktuell: readonly string[], bereich: string, an: boolean): string[] {
  return an ? [...new Set([...aktuell, bereich])] : aktuell.filter((b) => b !== bereich)
}
