import type { Pflichtfoto, RapportArt, RapportBild } from '../types'

/** Pflichtfotos einer Rapport-Art (leere Liste, wenn nichts eingestellt ist). */
export function pflichtFuer(
  liste: Partial<Record<RapportArt, Pflichtfoto[]>> | undefined,
  art: RapportArt,
): Pflichtfoto[] {
  return liste?.[art] ?? []
}

/** Welche Pflichtfotos noch fehlen; Fotos, die erst am Handy warten, zählen schon (sie gehen später hoch). */
export function fehlendePflichtfotos(
  pflicht: readonly Pflichtfoto[],
  bilder: readonly Pick<RapportBild, 'ordner' | 'kategorie'>[],
) {
  const da = new Set(bilder.filter((b) => b.ordner === 'fotos' && b.kategorie).map((b) => b.kategorie))
  return pflicht.filter((p) => !da.has(p.schluessel))
}
