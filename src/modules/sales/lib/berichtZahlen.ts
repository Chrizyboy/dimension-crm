import type { BerichtQuelle } from '../services/bericht'

/** Abgleich erhalten gegen gekauft einer Anbieter-Quelle: fehlt (negativ), stimmt (0), mehr (positiv). */
export function abgleich(q: Pick<BerichtQuelle, 'erhalten' | 'gekauft'>): number | null {
  return q.gekauft ? q.erhalten - q.gekauft : null
}

/** Häufigste Gründe bei «kein Interesse», mit Anzahl (V175 lbReasons). */
export function gruende(q: BerichtQuelle, ohneGrund: string): [string, number][] {
  const n = new Map<string, number>()
  for (const l of q.leads) if (l.stand === 'kein') n.set(l.grund ?? ohneGrund, (n.get(l.grund ?? ohneGrund) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1])
}

/** Kennzahlen oben im Bericht (V175): Leads, gekauft, Abgleich, Termin/Offerte, kein Interesse. */
export function kennzahlen(liste: readonly BerichtQuelle[], istAnbieter: (quelle: string) => boolean) {
  const anbieter = liste.filter((q) => istAnbieter(q.quelle))
  const leads = liste.reduce((a, q) => a + q.erhalten, 0)
  const gekauftErhalten = anbieter.reduce((a, q) => a + q.erhalten, 0)
  const gekauft = anbieter.reduce((a, q) => a + (q.gekauft ?? 0), 0)
  const fehlen = anbieter.reduce((a, q) => a + Math.max(0, -(abgleich(q) ?? 0)), 0)
  const terminOfferte = liste.reduce((a, q) => a + q.termin + q.offeriert, 0)
  const kein = liste.reduce((a, q) => a + q.keinInteresse, 0)
  const anteil = (x: number) => (leads ? Math.round((100 * x) / leads) : 0)
  return {
    leads,
    gekauftErhalten,
    eigene: leads - gekauftErhalten,
    quellen: liste.length,
    gekauft,
    fehlen,
    terminOfferte,
    terminAnteil: anteil(terminOfferte),
    kein,
    keinAnteil: anteil(kein),
  }
}
