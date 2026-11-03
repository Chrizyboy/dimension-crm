import type { Geschaeft } from '../types'
import type { RichtpreisEinstellung } from './einstellung'

export interface Richtpreis {
  /** Angenommene Leistung und woher sie kommt. */
  kwp: number
  kwpQuelle: 'offerte' | 'sonnendach' | 'website'
  /** Mehr als die Grenze ohne Besuch: Richtpreis nur als grobe Grössenordnung. */
  besuchNoetig: boolean
  posten: { art: 'pv' | 'batterie' | 'wallbox' | 'waermepumpe'; rappen: number }[]
  /** Summe exkl. MWST und Spanne (± Prozent), in Rappen, auf ganze Hundert Franken gerundet. */
  rappen: number
  vonRappen: number
  bisRappen: number
  foerderungRappen: number
}

const HUNDERT = 10_000

const runde = (rappen: number) => Math.round(rappen / HUNDERT) * HUNDERT

/** Preis pro kWp aus den Stufen (die erste Stufe, deren Grenze die Leistung fasst). */
export function chfProKwp(kwp: number, e: RichtpreisEinstellung): number {
  const stufe = e.pv_stufen.find((s) => s.bis_kwp === null || kwp <= s.bis_kwp) ?? e.pv_stufen.at(-1)
  return stufe?.chf_pro_kwp ?? 0
}

/**
 * Richtpreis für den Verkauf, NUR intern (Entscheid Chris 2.11.2026: nie an den Kunden). Leistung aus der
 * Offerte, sonst aus der geeigneten Dachfläche von sonnendach.ch oder der Website, mal kWp pro m².
 * Ohne Leistung: null. Beträge exkl. MWST; die Anzeige rechnet die MWST mit useMwst() dazu.
 */
export function richtpreis(
  g: Pick<Geschaeft, 'kwp' | 'dach' | 'interesse'>,
  e: RichtpreisEinstellung,
): Richtpreis | null {
  const flaecheSonne = g.dach.sonnendach?.dachflaeche_m2
  const flaecheWeb = g.dach.website?.flaeche_m2
  let kwp: number
  let kwpQuelle: Richtpreis['kwpQuelle']
  if (g.kwp) {
    kwp = g.kwp
    kwpQuelle = 'offerte'
  } else if (flaecheSonne) {
    kwp = flaecheSonne * e.kwp_pro_m2
    kwpQuelle = 'sonnendach'
  } else if (flaecheWeb) {
    kwp = flaecheWeb * e.kwp_pro_m2
    kwpQuelle = 'website'
  } else return null
  kwp = Math.round(kwp * 10) / 10
  if (kwp <= 0) return null

  const posten: Richtpreis['posten'] = []
  const pv = g.interesse.length === 0 || g.interesse.includes('pv')
  if (pv) posten.push({ art: 'pv', rappen: Math.round(kwp * chfProKwp(kwp, e) * 100) })
  if (g.interesse.includes('batterie')) posten.push({ art: 'batterie', rappen: e.batterie_chf * 100 })
  if (g.interesse.includes('wallbox')) posten.push({ art: 'wallbox', rappen: e.wallbox_chf * 100 })
  if (g.interesse.includes('waermepumpe')) posten.push({ art: 'waermepumpe', rappen: e.waermepumpe_chf * 100 })

  const summe = posten.reduce((s, p) => s + p.rappen, 0)
  const spanne = e.spanne_prozent / 100
  return {
    kwp,
    kwpQuelle,
    besuchNoetig: kwp > e.max_kwp_ohne_besuch,
    posten,
    rappen: runde(summe),
    vonRappen: runde(summe * (1 - spanne)),
    bisRappen: runde(summe * (1 + spanne)),
    foerderungRappen: pv ? runde(kwp * e.foerderung_chf_pro_kwp * 100) : 0,
  }
}
