import type { Anlage } from '../types'

/** Eine laufende Garantie der Anlage für den Hinweis im Dialog. */
export interface LaufendeGarantie {
  /** null = Montage-Garantie der Anlage, sonst die Art der Komponente. */
  art: string | null
  hersteller: string
  bis: string
}

/**
 * Laufende Garantien einer Anlage am Tag `heute` (ISO-Datum): Montage und Komponenten. Mit `komponente` nur die
 * Montage und Komponenten dieser Art, wie die Datenbank (intern.service_garantie_laeuft) beim Anlegen.
 */
export function laufendeGarantien(
  a: Pick<Anlage, 'garantie_bis' | 'komponenten'> | null | undefined,
  komponente: string | null,
  heute: string = new Date().toISOString().slice(0, 10),
): LaufendeGarantie[] {
  if (!a) return []
  const liste: LaufendeGarantie[] = []
  if (a.garantie_bis && a.garantie_bis >= heute) liste.push({ art: null, hersteller: '', bis: a.garantie_bis })
  for (const k of a.komponenten) {
    if (k.garantie_bis && k.garantie_bis >= heute && (!komponente || k.art === komponente))
      liste.push({ art: k.art, hersteller: k.hersteller, bis: k.garantie_bis })
  }
  return liste
}
