import type { Bedarf, Bestellung, PlanZeile, Schritt } from '../types'

/** Bedarf eines Lieferanten für die Spalte «Zu bestellen». */
export interface LieferantBedarf {
  lieferant_id: string | null
  lieferant: string | null
  zeilen: number
  projekte: string[]
  total_rappen: number
  bestellen_bis: string | null
}

/** Bedarf je Lieferant bündeln (ohne Lieferant = eigene Gruppe), dringendste zuerst. */
export function bedarfJeLieferant(bedarf: Bedarf[]): LieferantBedarf[] {
  const gruppen = new Map<string, LieferantBedarf>()
  for (const b of bedarf) {
    const zuBestellen = b.fehlt - b.aus_lager
    if (zuBestellen <= 0) continue
    const key = b.lieferant_id ?? '–'
    const g = gruppen.get(key) ?? {
      lieferant_id: b.lieferant_id,
      lieferant: b.lieferant,
      zeilen: 0,
      projekte: [],
      total_rappen: 0,
      bestellen_bis: null,
    }
    g.zeilen += 1
    const name = b.projekt_nummer ?? 'Lager'
    if (!g.projekte.includes(name)) g.projekte.push(name)
    g.total_rappen += Math.round(zuBestellen * (b.ek_rappen ?? 0))
    if (b.bestellen_bis && (!g.bestellen_bis || b.bestellen_bis < g.bestellen_bis)) g.bestellen_bis = b.bestellen_bis
    gruppen.set(key, g)
  }
  return [...gruppen.values()].sort((a, b) => (a.bestellen_bis ?? '9999').localeCompare(b.bestellen_bis ?? '9999'))
}

/** Bestellungen nach Schritt im Leitstand. */
export function nachSchritt(liste: Bestellung[]): Record<Exclude<Schritt, 'storniert' | 'fertig'>, Bestellung[]> {
  const r = { freigabe: [], ab_offen: [], unterwegs: [], eingang: [], rechnung: [] } as Record<
    Exclude<Schritt, 'storniert' | 'fertig'>,
    Bestellung[]
  >
  for (const b of liste) if (b.schritt in r) r[b.schritt as keyof typeof r].push(b)
  for (const k of Object.keys(r) as (keyof typeof r)[])
    r[k].sort(
      (a, b) => Number(b.gefaehrdet) - Number(a.gefaehrdet) || (a.erwartet_am ?? '').localeCompare(b.erwartet_am ?? ''),
    )
  return r
}

/** Kopfzahlen des Leitstands. */
export function kopfzahlen(liste: Bestellung[], bedarf: LieferantBedarf[], plan: PlanZeile[], heute: string) {
  const in14 = new Date(`${heute}T12:00:00`)
  in14.setDate(in14.getDate() + 14)
  const grenze = in14.toISOString().slice(0, 10)
  const bald = plan.filter((p) => p.baubeginn && p.baubeginn >= heute && p.baubeginn <= grenze)
  return {
    zuBestellen: bedarf.filter((b) => b.lieferant_id).length,
    freigabe: liste.filter((b) => b.schritt === 'freigabe').length,
    abOffen: liste.filter((b) => b.schritt === 'ab_offen').length,
    gefaehrdet:
      liste.filter((b) => b.gefaehrdet).length + plan.filter((p) => p.gefaehrdet && p.zeilen_fehlt > 0).length,
    baustellen: bald.length,
    komplett: bald.filter((p) => p.zeilen > 0 && p.zeilen_fehlt === 0 && p.zeilen_unterwegs === 0).length,
    offenRappen: liste
      .filter((b) => b.status === 'bestellt' || b.status === 'teilgeliefert')
      .reduce((s, b) => s + (b.total_rappen ?? 0), 0),
  }
}
