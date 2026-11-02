import type { Grossprojekt, GrossprojektRegeln, RechnungWerte } from '../types'

/** Eingaben des Rechners mit Herkunft: eigener Wert (Projekt) oder Vorschlag (Schätzung/Annahmen). */
export type Eingaben = Required<RechnungWerte>

export interface Ergebnis {
  ertrag_kwh: number
  /** Eigenverbrauchter Solarstrom, höchstens so viel wie der Verbrauch. */
  eigen_kwh: number
  /** Stromkosten pro Jahr heute und mit Contracting (Rappen). */
  heute_rappen: number
  mit_rappen: number
  ersparnis_rappen: number
  investition_rappen: number
}

/** Staffelpreis CHF/kWp wie in der Datenbank (intern.gp_staffel). */
function staffel(kwp: number, regeln: GrossprojektRegeln | undefined): number {
  const s = regeln?.annahmen?.chf_pro_kwp ?? []
  return s.find((x) => x.bis === null || kwp <= x.bis)?.chf ?? 1200
}

/**
 * Vorschläge für alle Eingaben: eigene Werte des Projekts zuerst, sonst Schätzung und Annahmen. Verbrauch,
 * Eigenverbrauch und Strompreis haben ohne Unterlagen nur grobe Standards und sind darum als Vorschlag markiert.
 */
export function eingaben(
  g: Pick<Grossprojekt, 'rechnung' | 'schaetzung'>,
  regeln: GrossprojektRegeln | undefined,
): Eingaben {
  const r = g.rechnung
  const kwp = r.kwp ?? g.schaetzung.kwp ?? 0
  const kwhProKwp =
    r.kwh_pro_kwp ??
    (g.schaetzung.kwp && g.schaetzung.ertrag_kwh
      ? Math.round(g.schaetzung.ertrag_kwh / g.schaetzung.kwp)
      : (regeln?.annahmen?.kwh_pro_kwp ?? 1000))
  return {
    kwp,
    kwh_pro_kwp: kwhProKwp,
    verbrauch_kwh: r.verbrauch_kwh ?? Math.round(kwp * kwhProKwp),
    eigenverbrauch_prozent: r.eigenverbrauch_prozent ?? 50,
    strompreis_rp: r.strompreis_rp ?? 22,
    preis_rp: r.preis_rp ?? g.schaetzung.preis_rp_kwh ?? 16,
    chf_pro_kwp: r.chf_pro_kwp ?? staffel(kwp, regeln),
  }
}

/** Was der Kunde spart und was investiert wird. Beträge in Rappen, ganze Zahlen. */
export function rechne(e: Eingaben): Ergebnis {
  const ertrag = e.kwp * e.kwh_pro_kwp
  const eigen = Math.min(ertrag * (e.eigenverbrauch_prozent / 100), e.verbrauch_kwh)
  const heute = e.verbrauch_kwh * e.strompreis_rp
  const mit = (e.verbrauch_kwh - eigen) * e.strompreis_rp + eigen * e.preis_rp
  return {
    ertrag_kwh: Math.round(ertrag),
    eigen_kwh: Math.round(eigen),
    heute_rappen: Math.round(heute),
    mit_rappen: Math.round(mit),
    ersparnis_rappen: Math.round(heute - mit),
    investition_rappen: Math.round(e.kwp * e.chf_pro_kwp * 100),
  }
}
