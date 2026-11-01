import type { Anlage } from '../types'

/** Was an einer Anlage am Stichtag noch Garantie hat: die ganze Anlage und/oder einzelne Komponenten. */
export interface GarantieStand {
  anlage: string | null
  komponenten: { art: string; hersteller: string; bis: string }[]
}

/**
 * Garantie am Stichtag (Datum «JJJJ-MM-TT»). Liefert null, wenn nichts mehr Garantie hat.
 * Dient beim Erfassen eines Falls als Vorschlag «Garantiefall»; entscheiden tut die Person.
 */
export function garantieAm(
  anlage: Pick<Anlage, 'garantie_bis' | 'komponenten'> | null | undefined,
  stichtag: string,
): GarantieStand | null {
  if (!anlage) return null
  const ganz = anlage.garantie_bis && anlage.garantie_bis >= stichtag ? anlage.garantie_bis : null
  const komponenten = anlage.komponenten
    .filter((k) => k.garantie_bis && k.garantie_bis >= stichtag)
    .map((k) => ({ art: k.art, hersteller: k.hersteller, bis: k.garantie_bis ?? '' }))
  return ganz || komponenten.length > 0 ? { anlage: ganz, komponenten } : null
}
