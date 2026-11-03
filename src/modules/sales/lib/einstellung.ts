/** Einstellungen des Verkaufs (einstellungen.verkauf, nur Administration ändert sie). */
export interface VerkaufEinstellung {
  erstkontakt_minuten: number
  eskalation_minuten: number
  arbeitszeit: { tage: number[]; von: string; bis: string }
  feiertage: string[]
  nachfassen_tage: number[]
  verlust_wiedervorlage_monate: number
  richtpreis: RichtpreisEinstellung
}

export interface RichtpreisEinstellung {
  pv_stufen: { bis_kwp: number | null; chf_pro_kwp: number }[]
  kwp_pro_m2: number
  max_kwp_ohne_besuch: number
  batterie_chf: number
  wallbox_chf: number
  waermepumpe_chf: number
  foerderung_chf_pro_kwp: number
  spanne_prozent: number
}

/** Werte wie in der Migration; gelten, solange die Datenbank nichts anderes liefert. */
export const VERKAUF_STANDARD: VerkaufEinstellung = {
  erstkontakt_minuten: 15,
  eskalation_minuten: 120,
  arbeitszeit: { tage: [1, 2, 3, 4, 5], von: '07:30', bis: '18:00' },
  feiertage: [],
  nachfassen_tage: [3, 10, 21],
  verlust_wiedervorlage_monate: 12,
  richtpreis: {
    pv_stufen: [
      { bis_kwp: 10, chf_pro_kwp: 2300 },
      { bis_kwp: 20, chf_pro_kwp: 1950 },
      { bis_kwp: 50, chf_pro_kwp: 1650 },
      { bis_kwp: null, chf_pro_kwp: 1400 },
    ],
    kwp_pro_m2: 0.2,
    max_kwp_ohne_besuch: 30,
    batterie_chf: 8400,
    wallbox_chf: 2300,
    waermepumpe_chf: 32000,
    foerderung_chf_pro_kwp: 360,
    spanne_prozent: 15,
  },
}

/** Ergänzt fehlende Werte aus dem Standard (ältere Datenbank oder halb ausgefüllte Einstellung). */
export function mitStandard(wert: unknown): VerkaufEinstellung {
  const w = (wert && typeof wert === 'object' ? wert : {}) as Partial<VerkaufEinstellung>
  return {
    ...VERKAUF_STANDARD,
    ...w,
    arbeitszeit: { ...VERKAUF_STANDARD.arbeitszeit, ...w.arbeitszeit },
    richtpreis: { ...VERKAUF_STANDARD.richtpreis, ...w.richtpreis },
  }
}
