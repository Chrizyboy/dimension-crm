import type { Offerte, PdfWerte } from '../types'

/** Felder der Offerte, die aus dem PDF kommen können, in der Reihenfolge der Anzeige. */
export const PDF_FELDER = [
  'betrag_rappen',
  'leistung_kwp',
  'anzahl_module',
  'wechselrichter',
  'batterie',
  'angebot_am',
] as const

export type PdfFeld = (typeof PDF_FELDER)[number]

export interface FeldVergleich {
  feld: PdfFeld
  alt: string | number | null
  neu: string | number
  /** Feld ist in der Offerte noch leer: «nur leere Felder füllen» setzt es. */
  leer: boolean
  gleich: boolean
}

/** Werte aus dem PDF in Spaltennamen der Offerte (für offerte_werte_setzen). */
export function werteFuerOfferte(
  p: PdfWerte,
): Partial<Record<PdfFeld, string | number>> & { wirtschaftlichkeit?: unknown } {
  const w: Partial<Record<PdfFeld, string | number>> & { wirtschaftlichkeit?: unknown } = {}
  if (p.betragRappen !== undefined) w.betrag_rappen = p.betragRappen
  if (p.kwp !== undefined) w.leistung_kwp = p.kwp
  if (p.anzahlModule !== undefined) w.anzahl_module = p.anzahlModule
  if (p.wechselrichter) w.wechselrichter = p.wechselrichter
  if (p.batterie) w.batterie = p.batterie
  if (p.datum) w.angebot_am = p.datum
  if (Object.keys(p.wirtschaftlichkeit).length > 0) w.wirtschaftlichkeit = p.wirtschaftlichkeit
  return w
}

/** Vergleicht PDF und Offerte Feld für Feld (V91: zuerst zeigen, erst auf Knopfdruck speichern). */
export function vergleiche(o: Offerte, p: PdfWerte): FeldVergleich[] {
  const alt: Record<PdfFeld, string | number | null> = {
    betrag_rappen: o.betragRappen,
    leistung_kwp: o.kwp,
    anzahl_module: o.anzahlModule,
    wechselrichter: o.wechselrichter,
    batterie: o.batterie,
    angebot_am: o.angebotAm,
  }
  const neu = werteFuerOfferte(p)
  return PDF_FELDER.flatMap((feld) => {
    const n = neu[feld]
    if (n === undefined) return []
    const a = alt[feld]
    return [{ feld, alt: a, neu: n, leer: a === null || a === '', gleich: a !== null && String(a) === String(n) }]
  })
}

/** Nur die Felder, die gesetzt werden sollen: alle abweichenden oder nur die leeren. */
export function auswahlFuerSpeichern(
  vergleich: FeldVergleich[],
  nurLeere: boolean,
): Partial<Record<PdfFeld, string | number>> {
  const w: Partial<Record<PdfFeld, string | number>> = {}
  for (const v of vergleich) if (!v.gleich && (!nurLeere || v.leer)) w[v.feld] = v.neu
  return w
}
