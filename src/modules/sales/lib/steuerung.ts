import type { Geschaeft } from '../types'
import { arbeitsminuten } from './arbeitszeit'
import type { VerkaufEinstellung } from './einstellung'
import { schrittVonStand, VERKAUF_SCHRITTE } from './schritte'

/** Kennzahlen einer Gruppe (Verkäufer oder Quelle) für die Verkaufssteuerung der Geschäftsleitung. */
export interface SteuerZeile {
  schluessel: string
  leads: number
  /** Median der Arbeitsminuten bis zum ersten Kontakt; null ohne gemessene Leads. */
  erstkontaktMinuten: number | null
  /** Anteil innert der Frist (15 Min.) angerufener Leads, 0–1. */
  imTempo: number | null
  termin: number
  offerte: number
  gewonnen: number
  verloren: number
  gewonnenRappen: number
}

export interface Steuerung {
  gesamt: SteuerZeile
  proPerson: SteuerZeile[]
  proQuelle: SteuerZeile[]
  verlustgruende: { grund: string; anzahl: number }[]
}

function median(werte: number[]): number | null {
  if (werte.length === 0) return null
  const s = [...werte].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  const mitte = s[m] ?? 0
  return s.length % 2 ? mitte : Math.round(((s[m - 1] ?? mitte) + mitte) / 2)
}

function zeile(schluessel: string, liste: readonly Geschaeft[], e: VerkaufEinstellung): SteuerZeile {
  const tempo = liste.flatMap((g) =>
    !g.uebernommen && g.eingangZeit && g.erstkontaktAm
      ? [arbeitsminuten(new Date(g.eingangZeit), new Date(g.erstkontaktAm), e)]
      : [],
  )
  const erreicht = (ab: (typeof VERKAUF_SCHRITTE)[number]) =>
    liste.filter((g) => {
      const s = schrittVonStand(g.stand)
      if (s === 'aus') return ab === 'termin' ? Boolean(g.terminAm) : ab === 'offerte' && Boolean(g.offerteId)
      return VERKAUF_SCHRITTE.indexOf(s) >= VERKAUF_SCHRITTE.indexOf(ab) || (ab === 'termin' && Boolean(g.terminAm))
    }).length
  const gewonnen = liste.filter((g) => schrittVonStand(g.stand) === 'gewonnen')
  return {
    schluessel,
    leads: liste.length,
    erstkontaktMinuten: median(tempo),
    imTempo: tempo.length ? tempo.filter((m) => m < e.erstkontakt_minuten).length / tempo.length : null,
    termin: erreicht('termin'),
    offerte: erreicht('offerte'),
    gewonnen: gewonnen.length,
    verloren: liste.filter((g) => schrittVonStand(g.stand) === 'aus').length,
    gewonnenRappen: gewonnen.reduce((s, g) => s + (g.wertRappen ?? 0), 0),
  }
}

function gruppiere(liste: readonly Geschaeft[], nach: (g: Geschaeft) => string, e: VerkaufEinstellung) {
  const gruppen = new Map<string, Geschaeft[]>()
  for (const g of liste) {
    const k = nach(g)
    gruppen.set(k, [...(gruppen.get(k) ?? []), g])
  }
  return [...gruppen].map(([k, l]) => zeile(k, l, e)).sort((a, b) => b.leads - a.leads)
}

/**
 * Verkaufssteuerung: alle Leads mit Eingang im Zeitraum (ISO, einschliesslich), je Verkäufer und Quelle:
 * Tempo bis zum ersten Kontakt, wie viele bis Termin, Offerte und Auftrag kamen, und warum verloren.
 * Nur echte Leads (mit Verkaufschance); Offerten ohne Lead aus V233 haben keinen Eingang.
 */
export function steuerung(
  geschaefte: readonly Geschaeft[],
  von: string,
  bis: string,
  e: VerkaufEinstellung,
): Steuerung {
  const leads = geschaefte.filter((g) => g.verkaufschanceId && g.eingangAm && g.eingangAm >= von && g.eingangAm <= bis)
  const gruende = new Map<string, number>()
  for (const g of leads) {
    if (schrittVonStand(g.stand) === 'aus') {
      const grund = g.verlustgrund?.trim() || '–'
      gruende.set(grund, (gruende.get(grund) ?? 0) + 1)
    }
  }
  return {
    gesamt: zeile('gesamt', leads, e),
    proPerson: gruppiere(leads, (g) => g.personId ?? '', e),
    proQuelle: gruppiere(leads, (g) => g.quelle ?? '', e),
    verlustgruende: [...gruende]
      .map(([grund, anzahl]) => ({ grund, anzahl }))
      .sort((a, b) => b.anzahl - a.anzahl)
      .slice(0, 8),
  }
}
