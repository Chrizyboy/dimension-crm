import type { Bereich, Fakt } from '../types'

/** Wie eine Zeile zählt: Anzahl, Summe der Beträge oder Quote (angenommen von entschieden). */
export type Mass = 'anzahl' | 'summe' | 'quote'

/** Eine Zeile der Tabelle «nach Standort» / «nach Person». */
export interface ZeilenDef {
  id: string
  schluessel: string
  mass: Mass
}

/** Zeilengruppen wie in V233 (Leads, Offerten, Zahlungen, Aftersales). */
export const GRUPPEN: { id: string; zeilen: ZeilenDef[] }[] = [
  {
    id: 'leads',
    zeilen: [
      { id: 'leads_neu', schluessel: 'leads_neu', mass: 'anzahl' },
      { id: 'leads_offen', schluessel: 'leads_offen', mass: 'anzahl' },
      { id: 'termine', schluessel: 'termine', mass: 'anzahl' },
      { id: 'kein_interesse', schluessel: 'kein_interesse', mass: 'anzahl' },
    ],
  },
  {
    id: 'offerten',
    zeilen: [
      { id: 'gesendet', schluessel: 'gesendet', mass: 'anzahl' },
      { id: 'angebotswert', schluessel: 'gesendet', mass: 'summe' },
      { id: 'offen', schluessel: 'offen', mass: 'anzahl' },
      { id: 'nf_faellig', schluessel: 'nf_faellig', mass: 'anzahl' },
      { id: 'angenommen', schluessel: 'angenommen', mass: 'anzahl' },
      { id: 'auftragswert', schluessel: 'angenommen', mass: 'summe' },
      { id: 'verloren', schluessel: 'verloren', mass: 'anzahl' },
      { id: 'quote', schluessel: 'angenommen', mass: 'quote' },
      { id: 'bau', schluessel: 'bau', mass: 'anzahl' },
    ],
  },
  {
    id: 'zahlungen',
    zeilen: [
      { id: 'zahlung_offen', schluessel: 'zahlung_offen', mass: 'summe' },
      { id: 'zahlung_ueberfaellig', schluessel: 'zahlung_ueberfaellig', mass: 'summe' },
      { id: 'zahlung_eingang', schluessel: 'zahlung_eingang', mass: 'summe' },
    ],
  },
  {
    id: 'aftersales',
    zeilen: [
      { id: 'faelle_offen', schluessel: 'faelle_offen', mass: 'anzahl' },
      { id: 'faelle_neu', schluessel: 'faelle_neu', mass: 'anzahl' },
      { id: 'faelle_garantie', schluessel: 'faelle_garantie', mass: 'anzahl' },
      { id: 'faelle_erledigt', schluessel: 'faelle_erledigt', mass: 'anzahl' },
    ],
  },
]

/** Nur die Zeilen von Muri oder Bulle; «alle» lässt alles stehen (auch ohne Standort). */
export function nachBereich(fakten: Fakt[], b: Bereich): Fakt[] {
  return b === 'alle' ? fakten : fakten.filter((f) => f.standort === b)
}

/** Summe der Beträge in Rappen. */
export function summe(fakten: Fakt[]): number {
  return fakten.reduce((s, f) => s + (f.betrag_rappen ?? 0), 0)
}

/** Quote in Prozent: angenommen von allen entschiedenen (angenommen + verloren); null ohne Entscheid. */
export function quote(fakten: Fakt[]): number | null {
  const an = fakten.filter((f) => f.schluessel === 'angenommen').length
  const aus = fakten.filter((f) => f.schluessel === 'verloren').length
  return an + aus === 0 ? null : Math.round((an / (an + aus)) * 100)
}

/** Wert einer Zelle und die Zeilen dahinter (für den Klick). */
export function zelle(fakten: Fakt[], def: ZeilenDef): { wert: number | null; fakten: Fakt[] } {
  if (def.mass === 'quote') {
    const dahinter = fakten.filter((f) => f.schluessel === 'angenommen' || f.schluessel === 'verloren')
    return { wert: quote(dahinter), fakten: dahinter }
  }
  const dahinter = fakten.filter((f) => f.schluessel === def.schluessel)
  return { wert: def.mass === 'summe' ? summe(dahinter) : dahinter.length, fakten: dahinter }
}

/** Spalten nach Standort: Muri, Bulle, zusammen. */
export function nachStandort(fakten: Fakt[]): { id: string; fakten: Fakt[] }[] {
  return [
    { id: 'muri', fakten: fakten.filter((f) => f.standort === 'muri') },
    { id: 'bulle', fakten: fakten.filter((f) => f.standort === 'bulle') },
    { id: 'zusammen', fakten },
  ]
}

/** Spalten nach Person; was niemandem gehört oder einer unbekannten Person, kommt zu «Übrige». */
export function nachPerson(fakten: Fakt[], personen: { id: string }[]): { id: string; fakten: Fakt[] }[] {
  const bekannt = new Set(personen.map((p) => p.id))
  const spalten = personen
    .map((p) => ({ id: p.id, fakten: fakten.filter((f) => f.person_id === p.id) }))
    .filter((s) => s.fakten.length > 0)
  const uebrige = fakten.filter((f) => !f.person_id || !bekannt.has(f.person_id))
  return uebrige.length > 0 ? [...spalten, { id: 'uebrige', fakten: uebrige }] : spalten
}

/** Eine Zeile «Lead-Quellen» (V233 dashQuellen). */
export interface QuellenZeile {
  quelle: string
  leads: Fakt[]
  termine: Fakt[]
  offerten: Fakt[]
  auftraege: Fakt[]
  umsatz_rappen: number
  quote: number | null
  kosten_lead_rappen: number | null
  kosten_total_rappen: number | null
  kosten_auftrag_rappen: number | null
}

/** Lead-Quellen: wie weit kamen die Leads einer Quelle, und was kostete ein Auftrag? Grösste Quelle zuerst. */
export function quellen(fakten: Fakt[], kosten: Record<string, number>): QuellenZeile[] {
  const namen = [...new Set(fakten.filter((f) => f.schluessel === 'leads_neu').map((f) => f.quelle ?? 'ohne'))]
  const von = (s: string, q: string) => fakten.filter((f) => f.schluessel === s && (f.quelle ?? 'ohne') === q)
  return namen
    .map((q) => {
      const leads = von('leads_neu', q)
      const auftraege = von('quelle_auftrag', q)
      const proLead = kosten[q] ?? null
      const total = proLead === null ? null : proLead * leads.length
      return {
        quelle: q,
        leads,
        termine: von('quelle_termin', q),
        offerten: von('quelle_offerte', q),
        auftraege,
        umsatz_rappen: summe(auftraege),
        quote: leads.length ? Math.round((auftraege.length / leads.length) * 100) : null,
        kosten_lead_rappen: proLead,
        kosten_total_rappen: total,
        kosten_auftrag_rappen: total !== null && auftraege.length ? Math.round(total / auftraege.length) : null,
      }
    })
    .sort((a, b) => b.leads.length - a.leads.length)
}

/** Wohin der Klick auf eine Detail-Zeile führt (Tabelle für `zielVon`). */
export function tabelleVon(art: Fakt['art']): string {
  return {
    lead: 'verkaufschancen',
    offerte: 'offerten',
    projekt: 'projekte',
    zahlung: 'projekte',
    fall: 'service_faelle',
  }[art]
}
