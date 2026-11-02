import type { MargeZeile } from '../services/ablaeufe'

/** Ansichten der Projektliste. */
export type MargeAnsicht = 'laufend' | 'abgeschlossen' | 'unterSoll' | 'alle'

/** Wie viele Prozentpunkte unter der kalkulierten Marge ein Projekt als «unter Soll» gilt. */
export const TOLERANZ_PUNKTE = 5

const prozentVon = (marge: number, umsatz: number) => (umsatz > 0 ? (marge / umsatz) * 100 : null)

/**
 * Wertet die Marge aller Projekte aus: je Produkt (nur abgeschlossene, damit halbfertige Baustellen die Zahl nicht
 * verfälschen), angefangene Arbeiten (Kosten laufender Projekte, die noch nicht verrechnet sind) und die Zeilen der
 * gewählten Ansicht, schlechteste Marge zuerst.
 */
export function margeAuswerten(liste: MargeZeile[], ansicht: MargeAnsicht) {
  const zeilen = liste
    .filter((m) => m.umsatz_rappen > 0 || m.kosten_rappen > 0)
    .map((m) => {
      const prozent = prozentVon(m.umsatz_rappen - m.kosten_rappen, m.umsatz_rappen)
      const soll =
        m.soll_verkauf_rappen && m.soll_einkauf_rappen !== null
          ? prozentVon(m.soll_verkauf_rappen - m.soll_einkauf_rappen, m.soll_verkauf_rappen)
          : null
      const fertig = m.status === 'abgeschlossen' || m.schlussrechnung
      const unterSoll = fertig && prozent !== null && soll !== null && prozent < soll - TOLERANZ_PUNKTE
      return { m, prozent, soll, fertig, unterSoll }
    })
  const passt = (z: (typeof zeilen)[number], a: MargeAnsicht) =>
    a === 'alle' || (a === 'laufend' ? !z.fertig : a === 'abgeschlossen' ? z.fertig : z.unterSoll)
  const anzahl = {
    laufend: zeilen.filter((z) => passt(z, 'laufend')).length,
    abgeschlossen: zeilen.filter((z) => passt(z, 'abgeschlossen')).length,
    unterSoll: zeilen.filter((z) => passt(z, 'unterSoll')).length,
    alle: zeilen.length,
  }
  const produkte = (['pv', 'waermepumpe', 'batterie'] as const).map((produkt) => {
    const l = zeilen.filter((z) => z.fertig && z.m.produkt === produkt)
    const umsatz = l.reduce((s, z) => s + z.m.umsatz_rappen, 0)
    const marge = l.reduce((s, z) => s + z.m.umsatz_rappen - z.m.kosten_rappen, 0)
    return { produkt, anzahl: l.length, umsatz, marge, prozent: prozentVon(marge, umsatz) }
  })
  const angefangen = zeilen
    .filter((z) => !z.fertig)
    .reduce((s, z) => s + Math.max(0, z.m.kosten_rappen - z.m.verrechnet_rappen), 0)
  return {
    zeilen: zeilen.filter((z) => passt(z, ansicht)).sort((a, b) => (a.prozent ?? 999) - (b.prozent ?? 999)),
    anzahl,
    produkte,
    angefangen,
  }
}
