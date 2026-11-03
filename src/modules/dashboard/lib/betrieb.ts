import type { Fakt } from '../types'
import { summe } from './auswertung'
import { gruppiere, von } from './verkauf'
import { alleFaecher } from './zeitraum'

/** Offene Rechnungen nach Tagen über der Fälligkeit (negativ = noch nicht fällig). */
export const RECHNUNG_ALTER = [
  { id: 'nichtFaellig', von: -Infinity, bis: 0 },
  { id: 'bis30', von: 1, bis: 30 },
  { id: 'bis60', von: 31, bis: 60 },
  { id: 'mehr60', von: 61, bis: Infinity },
] as const

/** Offene Rechnungen je Altersklasse mit Betrag. */
export function rechnungenNachAlter(offen: readonly Fakt[]) {
  return RECHNUNG_ALTER.map((k) => {
    const z = offen.filter((f) => (f.tage ?? 0) >= k.von && (f.tage ?? 0) <= k.bis)
    return { id: k.id, fakten: z, betrag: summe(z) }
  })
}

/** Überfällige offene Rechnungen (Fälligkeit vorbei). */
export function ueberfaellig(offen: readonly Fakt[]): Fakt[] {
  return offen.filter((f) => (f.tage ?? 0) > 0)
}

/** Werte je Monat für das Säulendiagramm (Umsatz und Zahlungseingang). */
export function proMonat(fakten: readonly Fakt[], schluessel: readonly string[], von: string, bis: string) {
  const start =
    von < '2001-01-01'
      ? (fakten
          .map((f) => f.datum)
          .filter((d): d is string => !!d)
          .sort()[0] ?? bis)
      : von
  return alleFaecher('jahr', start, bis).map((monat) => ({
    monat,
    reihen: schluessel.map((s) => fakten.filter((f) => f.schluessel === s && f.datum?.startsWith(monat))),
  }))
}

/** Auftragseingang kumuliert je Monat (für die Linie «Auftragseingang kumuliert»). */
export function kumuliert(fakten: readonly Fakt[], monate: readonly string[]): number[] {
  let s = 0
  return monate.map((m) => (s += summe(fakten.filter((f) => f.datum?.startsWith(m)))))
}

/** Reaktion eines neuen Service-Falls: «ok», «spaet», «offen» oder «ohne» (ohne Reaktionszeit). */
export function reaktionVon(f: Fakt): string {
  return (f.zusatz ?? '').split('|')[1] ?? 'ohne'
}

/** Komponente eines Service-Falls. */
export function komponenteVon(f: Fakt): string {
  return (f.zusatz ?? '').split('|')[0] || 'ohne'
}

/** Anteil der Fälle mit eingehaltener Reaktionszeit (nur entschiedene: ok oder zu spät). */
export function reaktionQuote(faelle: readonly Fakt[]): { prozent: number | null; fakten: Fakt[] } {
  const entschieden = faelle.filter((f) => ['ok', 'spaet'].includes(reaktionVon(f)))
  const ok = entschieden.filter((f) => reaktionVon(f) === 'ok').length
  return { prozent: entschieden.length ? Math.round((ok / entschieden.length) * 100) : null, fakten: entschieden }
}

/** Fälle je Komponente, mit Anteil Garantie aus der bestehenden Kennzahl «faelle_garantie». */
export function faelleNachKomponente(fakten: readonly Fakt[]) {
  const garantie = new Set(von(fakten, 'faelle_garantie').map((f) => f.id))
  return gruppiere(von(fakten, 'fall_neu'), komponenteVon).map((g) => ({
    ...g,
    garantie: g.fakten.filter((f) => garantie.has(f.id)),
  }))
}

/** Wartungsverträge je Paket: aktiv, neu, gekündigt und Jahreswert der aktiven (exkl. MWST). */
export function wartungNachPaket(fakten: readonly Fakt[]) {
  const pakete = [...new Set(fakten.filter((f) => f.art === 'wartung').map((f) => f.zusatz ?? 'ohne'))].sort()
  return pakete.map((p) => {
    const je = (s: string) => fakten.filter((f) => f.schluessel === s && (f.zusatz ?? 'ohne') === p)
    const aktiv = je('wartung_aktiv')
    return { paket: p, aktiv, neu: je('wartung_neu'), gekuendigt: je('wartung_gekuendigt'), jahreswert: summe(aktiv) }
  })
}
