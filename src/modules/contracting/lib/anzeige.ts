import { formatChf } from '@/lib/format'
import type { Ansicht, Grossprojekt } from '../types'

type Ton = 'neutral' | 'marke' | 'info' | 'ok' | 'warnung' | 'kritisch'

/** Punkte als Stufe: ab 70 sehr gut, ab 50 gut, darunter eher klein. Ausgeschlossene sind «aus». */
export function punkteStufe(g: Pick<Grossprojekt, 'punkte' | 'ausschluss'>): 'sehr_gut' | 'gut' | 'klein' | 'aus' {
  if (g.ausschluss) return 'aus'
  if (g.punkte >= 70) return 'sehr_gut'
  if (g.punkte >= 50) return 'gut'
  return 'klein'
}

/** Farbe der Punkte-Marke. */
export const STUFE_TON: Record<ReturnType<typeof punkteStufe>, Ton> = {
  sehr_gut: 'ok',
  gut: 'info',
  klein: 'neutral',
  aus: 'neutral',
}

/** Farbe des Stands. */
export const STAND_TON: Record<Grossprojekt['stand'], Ton> = {
  pruefen: 'warnung',
  beobachten: 'neutral',
  bewilligt: 'ok',
  verworfen: 'neutral',
}

/** Passt ein Grossprojekt in den Reiter? «Alle» zeigt alles ausser dem Papierkorb. */
export function inAnsicht(g: Pick<Grossprojekt, 'stand'>, a: Ansicht): boolean {
  if (a === 'alle' || a === 'annahmen') return true
  return g.stand === a
}

/** Ganze Zahl mit Schweizer Tausendertrennung: 12'500. */
export function zahl(n: number): string {
  return formatChf(Math.round(n) * 100).replace(/\.00$/, '')
}

/** Grösse in einer Zeile: «320 kWp · 90 kW Wärme» (Einheiten bleiben gleich in DE und FR). */
export function groesse(g: Pick<Grossprojekt, 'schaetzung'>, waerme: string): string {
  const s = g.schaetzung
  return [s.kwp ? `${zahl(s.kwp)} kWp` : null, s.waerme_kw ? `${zahl(s.waerme_kw)} kW ${waerme}` : null]
    .filter(Boolean)
    .join(' · ')
}

/** Gesamte geschätzte Investition (PV und Wärme) in Rappen, 0 wenn nichts geschätzt ist. */
export function investition(g: Pick<Grossprojekt, 'schaetzung'>): number {
  return (g.schaetzung.investition_rappen ?? 0) + (g.schaetzung.waerme_investition_rappen ?? 0)
}

/** Adresse in einer Zeile: «Industriestrasse 5, 5630 Muri AG». */
export function adresse(g: Pick<Grossprojekt, 'strasse' | 'plz' | 'gemeinde'>): string {
  return [g.strasse, [g.plz, g.gemeinde].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/** Link auf die Karte des Bundes mit Solardach-Eignung an der Lage des Gebäudes (oder null ohne Lage). */
export function kartenLink(g: Pick<Grossprojekt, 'lage_e' | 'lage_n'>, sprache: 'de' | 'fr'): string | null {
  if (!g.lage_e || !g.lage_n) return null
  const q = new URLSearchParams({
    lang: sprache,
    topic: 'energie',
    layers: 'ch.bfe.solarenergie-eignung-daecher',
    E: String(Math.round(g.lage_e)),
    N: String(Math.round(g.lage_n)),
    zoom: '12',
  })
  return `https://map.geo.admin.ch/#/map?${q.toString()}`
}
