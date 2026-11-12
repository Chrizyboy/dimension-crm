import type { WochenPerson } from '../types'

/**
 * Prüfungen der Arbeitszeit für das Wochenblatt (Arbeitsgesetz Art. 15: Pause ab 5½ h 15 Min., ab 7 h 30 Min.,
 * ab 9 h 60 Min.). Regeln und Grenzen kommen aus `einstellungen.baustelle.zeiten`; das hier sind die Standardwerte.
 */
export interface ZeitRegeln {
  woche_soll_h: number
  pausen: { ab_h: number; min: number }[]
  max_tag_h: number
  saldo_warnung_h: number
}

export const STANDARD_REGELN: ZeitRegeln = {
  woche_soll_h: 40,
  pausen: [
    { ab_h: 5.5, min: 15 },
    { ab_h: 7, min: 30 },
    { ab_h: 9, min: 60 },
  ],
  max_tag_h: 10,
  saldo_warnung_h: 50,
}

/** Mindestpause in Minuten für eine Arbeitszeit (Stunden ohne Pause gerechnet: Arbeit + Pause). */
export function pflichtPause(stunden: number, pause_min: number, regeln: ZeitRegeln = STANDARD_REGELN): number {
  const brutto = stunden + pause_min / 60
  return regeln.pausen.filter((p) => brutto > p.ab_h).reduce((m, p) => Math.max(m, p.min), 0)
}

export type Warnung =
  | { art: 'pause'; tag: string; fehlt_min: number }
  | { art: 'zu_lang'; tag: string; stunden: number }
  | { art: 'nicht_gestempelt'; tag: string }
  | { art: 'laeuft'; tag: string }
  | { art: 'saldo'; stunden: number }

/** Warnungen einer Person in der Woche; vergangene Einsatztage ohne Zeit gelten als «nicht gestempelt». */
export function warnungen(p: WochenPerson, heute: string, regeln: ZeitRegeln = STANDARD_REGELN): Warnung[] {
  const w: Warnung[] = []
  for (const t of p.tage) {
    if (t.laeuft && t.tag < heute) w.push({ art: 'laeuft', tag: t.tag })
    if (t.stunden > 0) {
      const fehlt = pflichtPause(t.stunden, t.pause_min, regeln) - t.pause_min
      if (fehlt > 0) w.push({ art: 'pause', tag: t.tag, fehlt_min: fehlt })
      if (t.stunden > regeln.max_tag_h) w.push({ art: 'zu_lang', tag: t.tag, stunden: t.stunden })
    } else if (t.einsatz && !t.abwesenheit && t.tag < heute && !t.laeuft) {
      w.push({ art: 'nicht_gestempelt', tag: t.tag })
    }
  }
  if (Math.abs(p.saldo_jahr) > regeln.saldo_warnung_h) w.push({ art: 'saldo', stunden: p.saldo_jahr })
  return w
}

/** Soll der Woche nach Pensum; ganze Abwesenheitstage an Werktagen zählen als erfüllt. */
export function wochenSoll(p: WochenPerson, regeln: ZeitRegeln = STANDARD_REGELN): number {
  const tag = (regeln.woche_soll_h / 5) * (p.pensum / 100)
  const werktage = p.tage.filter((t, i) => i < 5 && !(t.abwesenheit && !t.abwesenheit.halbtag)).length
  return Math.round(tag * werktage * 10) / 10
}

/** Summe der Woche. */
export function wochenIst(p: WochenPerson): number {
  return Math.round(p.tage.reduce((s, t) => s + t.stunden, 0) * 100) / 100
}
