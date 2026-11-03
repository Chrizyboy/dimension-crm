import type { Geplant } from '../types'

/** Filter im Reiter «Geplant». */
export const GEPLANT_FILTER = ['alle', 'heute', 'woche', 'aussen', 'gestoppt'] as const
export type GeplantFilter = (typeof GEPLANT_FILTER)[number]

/**
 * Geplante Schritte filtern: «heute» = bis Mitternacht, «woche» = nächste 7 Tage, «aussen» = Mail/SMS/Mahnung,
 * «gestoppt» = von Hand angehalten. Die Suche geht über Datensatz, Automation und Text.
 */
export function filterGeplant(liste: readonly Geplant[], filter: GeplantFilter, suche: string, jetzt: Date): Geplant[] {
  const mitternacht = new Date(jetzt)
  mitternacht.setHours(24, 0, 0, 0)
  const woche = jetzt.getTime() + 7 * 86_400_000
  const s = suche.trim().toLowerCase()
  return liste.filter((g) => {
    const zeit = new Date(g.weiter_am).getTime()
    const aktiv = g.stand !== 'gestoppt'
    const passt =
      filter === 'alle' ||
      (filter === 'heute' && aktiv && zeit < mitternacht.getTime()) ||
      (filter === 'woche' && aktiv && zeit < woche) ||
      (filter === 'aussen' && aktiv && g.nach_aussen) ||
      (filter === 'gestoppt' && !aktiv)
    if (!passt) return false
    if (!s) return true
    return [g.titel, g.name_de, g.name_fr, g.text_de, g.text_fr].some((x) => x?.toLowerCase().includes(s))
  })
}
