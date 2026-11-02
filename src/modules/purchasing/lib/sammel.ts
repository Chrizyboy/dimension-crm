import type { Bestellung } from '../types'

/** Lieferant und Lager, bei denen mehrere Entwürfe ans Lager offen sind (Kandidaten für eine Sammelbestellung). */
export function sammelKandidaten(
  entwuerfe: Pick<Bestellung, 'status' | 'lieferant_id' | 'lieferant' | 'lagerort_id'>[],
): { lieferant_id: string; lieferant: string; lagerort_id: string; anzahl: number }[] {
  const gruppen = new Map<string, { lieferant_id: string; lieferant: string; lagerort_id: string; anzahl: number }>()
  for (const b of entwuerfe) {
    if (b.status !== 'entwurf' || !b.lagerort_id) continue
    const k = `${b.lieferant_id}|${b.lagerort_id}`
    const g = gruppen.get(k) ?? {
      lieferant_id: b.lieferant_id,
      lieferant: b.lieferant,
      lagerort_id: b.lagerort_id,
      anzahl: 0,
    }
    g.anzahl += 1
    gruppen.set(k, g)
  }
  return [...gruppen.values()].filter((g) => g.anzahl > 1)
}

/** Wie dringend «bestellen bis» ist: vorbei, bald (bis 3 Tage) oder später. */
export function dringlichkeit(bis: string | null, heute: string): 'vorbei' | 'bald' | 'spaeter' | null {
  if (!bis) return null
  if (bis < heute) return 'vorbei'
  const tage = (new Date(bis).getTime() - new Date(heute).getTime()) / 86_400_000
  return tage <= 3 ? 'bald' : 'spaeter'
}
