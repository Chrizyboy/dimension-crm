import { STUFEN, type Grossprojekt, type PipelineRegeln, type Stufe } from '../types'

/** Standard, falls die Einstellung fehlt (gleich wie die Migration). */
const STANDARD_PROZENT: Record<Stufe, number> = {
  qualifizieren: 10,
  erstkontakt: 20,
  besichtigung: 35,
  daten: 50,
  angebot: 65,
  vertrag: 100,
  verloren: 0,
}

/** Wahrscheinlichkeit einer Stufe in Prozent (aus der Einstellung, sonst Standard). */
export function prozent(stufe: Stufe, regeln: PipelineRegeln | undefined): number {
  return regeln?.stufen?.find((s) => s.id === stufe)?.prozent ?? STANDARD_PROZENT[stufe]
}

/** Leistung in kWp: unterschrieben, sonst aus dem Rechner, sonst die Schätzung. */
export function kwpVon(g: Pick<Grossprojekt, 'vertrag_kwp' | 'rechnung' | 'schaetzung'>): number {
  return g.vertrag_kwp ?? g.rechnung.kwp ?? g.schaetzung.kwp ?? 0
}

/** Ist der nächste Schritt überfällig? (Datum vor heute, heute als JJJJ-MM-TT) */
export function ueberfaellig(g: Pick<Grossprojekt, 'naechster_schritt_am' | 'stufe'>, heute: string): boolean {
  return !!g.naechster_schritt_am && g.naechster_schritt_am < heute && g.stufe !== 'vertrag' && g.stufe !== 'verloren'
}

/** Gehört das Grossprojekt in die Pipeline (bewilligt, mit Stufe)? */
export function inPipeline(g: Pick<Grossprojekt, 'stand' | 'stufe'>): boolean {
  return g.stand === 'bewilligt' && g.stufe !== null
}

export interface PipelineZahlen {
  /** Offene Projekte (ohne Vertrag und Verloren). */
  offen: number
  kwpOffen: number
  kwpGewichtet: number
  /** Unterschrieben bis Ende des Zieljahrs. */
  kwpVertrag: number
  zielKwp: number
  zielJahr: number
  ueberfaellig: number
  ohneSchritt: number
  /** Investition gewichtet (Rappen), aus der Schätzung skaliert auf die kWp. */
  investitionGewichtet: number
}

/** Kennzahlen der Pipeline für die Leiste oben. Rechnet nur in der App, damit Zahl und Board übereinstimmen. */
export function pipelineZahlen(
  liste: Grossprojekt[],
  regeln: PipelineRegeln | undefined,
  heute: string,
): PipelineZahlen {
  const zielJahr = regeln?.ziel?.jahr ?? 2027
  const z: PipelineZahlen = {
    offen: 0,
    kwpOffen: 0,
    kwpGewichtet: 0,
    kwpVertrag: 0,
    zielKwp: regeln?.ziel?.kwp ?? 2000,
    zielJahr,
    ueberfaellig: 0,
    ohneSchritt: 0,
    investitionGewichtet: 0,
  }
  for (const g of liste) {
    if (!inPipeline(g) || !g.stufe || g.stufe === 'verloren') continue
    const kwp = kwpVon(g)
    if (g.stufe === 'vertrag') {
      if (!g.vertrag_am || Number(g.vertrag_am.slice(0, 4)) <= zielJahr) z.kwpVertrag += kwp
      continue
    }
    const anteil = prozent(g.stufe, regeln) / 100
    z.offen += 1
    z.kwpOffen += kwp
    z.kwpGewichtet += kwp * anteil
    const s = g.schaetzung
    if (s.kwp && s.investition_rappen) z.investitionGewichtet += (s.investition_rappen / s.kwp) * kwp * anteil
    if (ueberfaellig(g, heute)) z.ueberfaellig += 1
    if (!g.naechster_schritt) z.ohneSchritt += 1
  }
  return z
}

/** Projekte je Stufe für das Board, darin überfällige zuerst, dann nach Datum des nächsten Schritts. */
export function nachStufe(liste: Grossprojekt[]): Record<(typeof STUFEN)[number], Grossprojekt[]> {
  const leer = Object.fromEntries(STUFEN.map((s) => [s, [] as Grossprojekt[]])) as Record<
    (typeof STUFEN)[number],
    Grossprojekt[]
  >
  for (const g of liste) {
    if (inPipeline(g) && g.stufe && g.stufe !== 'verloren') leer[g.stufe].push(g)
  }
  for (const s of STUFEN) {
    leer[s].sort((a, b) => (a.naechster_schritt_am ?? '9999').localeCompare(b.naechster_schritt_am ?? '9999'))
  }
  return leer
}

/** Megawatt mit einer Stelle: 3.9 MWp; unter 1 MWp in kWp. */
export function leistung(kwp: number): string {
  return kwp >= 1000 ? `${(kwp / 1000).toFixed(1)} MWp` : `${String(Math.round(kwp))} kWp`
}

/** Heute als JJJJ-MM-TT in Zürcher Zeit (Fälligkeiten sind ganze Tage). */
export function heuteIso(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}
