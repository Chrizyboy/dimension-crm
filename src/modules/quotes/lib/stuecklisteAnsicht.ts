import type { StuecklistenPosition } from '../types'

export interface StuecklistenGruppe {
  name: string
  optional: boolean
  summeRappen: number
  positionen: StuecklistenPosition[]
}

/** Positionen nach Gruppe in der Reihenfolge des PDFs, Optionen immer am Schluss. */
export function gruppiere(liste: readonly StuecklistenPosition[]): StuecklistenGruppe[] {
  const gruppen: StuecklistenGruppe[] = []
  for (const p of liste) {
    let g = gruppen.find((x) => x.name === p.gruppe && x.optional === p.optional)
    if (!g) {
      g = { name: p.gruppe, optional: p.optional, summeRappen: 0, positionen: [] }
      gruppen.push(g)
    }
    g.positionen.push(p)
    g.summeRappen += p.preisRappen
  }
  return [...gruppen.filter((g) => !g.optional), ...gruppen.filter((g) => g.optional)]
}
