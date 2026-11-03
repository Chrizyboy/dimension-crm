import type { Fakt, KennzahlenEinstellungen } from '../types'
import { quote, summe } from './auswertung'
import { plusTage } from './zeitraum'

/** Die Zeilen eines Schlüssels. */
export function von(fakten: readonly Fakt[], schluessel: string): Fakt[] {
  return fakten.filter((f) => f.schluessel === schluessel)
}

/** Durchschnitt der Tage (gerundet auf eine Stelle), null ohne Zeilen mit Tagen. */
export function mittelTage(fakten: readonly Fakt[]): number | null {
  const tage = fakten.map((f) => f.tage).filter((t): t is number => typeof t === 'number' && t >= 0)
  return tage.length ? Math.round((tage.reduce((a, b) => a + b, 0) / tage.length) * 10) / 10 : null
}

/** Summe der kWp. */
export function kwpSumme(fakten: readonly Fakt[]): number {
  return Math.round(fakten.reduce((s, f) => s + (f.kwp ?? 0), 0) * 10) / 10
}

/** Veränderung in Prozent gegen den Vergleich; null ohne Vergleichswert (nicht durch 0 teilen). */
export function veraenderung(jetzt: number | null, vorher: number | null | undefined): number | null {
  if (jetzt === null || vorher === null || vorher === undefined || vorher === 0) return null
  return Math.round((jetzt / vorher - 1) * 100)
}

/** Stufen vom Lead zum Auftrag mit Ø Tagen je Schritt (Leads des Zeitraums, wie weit sie kamen). */
export function trichter(fakten: readonly Fakt[]) {
  const leads = von(fakten, 'leads_neu')
  return {
    stufen: [
      { id: 'leads', fakten: leads },
      { id: 'termin', fakten: von(fakten, 'quelle_termin') },
      { id: 'offerte', fakten: von(fakten, 'quelle_offerte') },
      { id: 'auftrag', fakten: von(fakten, 'quelle_auftrag') },
    ].map((s) => ({ ...s, anteil: leads.length ? Math.round((s.fakten.length / leads.length) * 100) : 0 })),
    tage: {
      termin: mittelTage(von(fakten, 'dauer_termin')),
      offerte: mittelTage(von(fakten, 'dauer_offerte')),
      auftrag: mittelTage(von(fakten, 'auftrag')),
    },
  }
}

export const PRODUKTE = ['pv', 'batterie', 'wallbox', 'waermepumpe'] as const

/** Anteil der Aufträge mit einem Produkt (aus Lead-Interesse und Offerte). */
export function produktmix(auftraege: readonly Fakt[]) {
  return PRODUKTE.map((p) => {
    const mit = auftraege.filter((f) => (f.zusatz ?? '').split(',').includes(p))
    return { produkt: p, fakten: mit, anteil: auftraege.length ? Math.round((mit.length / auftraege.length) * 100) : 0 }
  })
}

/** Zeilen nach einem Merkmal gruppiert, grösste Gruppe zuerst. */
export function gruppiere(fakten: readonly Fakt[], merkmal: (f: Fakt) => string) {
  const m = new Map<string, Fakt[]>()
  for (const f of fakten) m.set(merkmal(f), [...(m.get(merkmal(f)) ?? []), f])
  return [...m].map(([id, z]) => ({ id, fakten: z })).sort((a, b) => b.fakten.length - a.fakten.length)
}

/** Eine Zeile der Rangliste «Ziel je Person». */
export interface RangZeile {
  id: string
  auftraege: Fakt[]
  wert: number
  ziel: number | null
  quote: number | null
  reaktion: number | null
}

/**
 * Rangliste Verkauf (K3 A: alle sehen alle): Auftragseingang, Ziel anteilig, Quote und Ø Tage Termin → Offerte.
 * Nur Personen mit Aufträgen, Offerten oder einem Ziel; nach Auftragswert absteigend.
 */
export function rangliste(
  fakten: readonly Fakt[],
  personen: readonly { id: string }[],
  zielVon: (id: string) => number | null,
): RangZeile[] {
  return personen
    .map((p) => {
      const eigene = fakten.filter((f) => f.person_id === p.id)
      const auftraege = von(eigene, 'angenommen')
      return {
        id: p.id,
        auftraege,
        wert: summe(auftraege),
        ziel: zielVon(p.id),
        quote: quote(eigene.filter((f) => f.schluessel === 'angenommen' || f.schluessel === 'verloren')),
        reaktion: mittelTage(von(eigene, 'dauer_offerte')),
        aktiv: eigene.some((f) => f.schluessel === 'gesendet' || f.schluessel === 'angenommen'),
      }
    })
    .filter((z) => z.aktiv || z.ziel !== null)
    .map(({ id, auftraege, wert, ziel, quote, reaktion }) => ({ id, auftraege, wert, ziel, quote, reaktion }))
    .sort((a, b) => b.wert - a.wert)
}

/** Stände der offenen Pipeline; «alt» = älter als `alt_tage`, egal in welchem Stand. */
export const PIPELINE_STAENDE = ['offeriert', 'nachfassen', 'vertagt', 'alt'] as const

/** Offene Offerten nach Stand, mit Wahrscheinlichkeit und gewichtetem Wert (K2 A: fest je Stand). */
export function pipelineNachStand(offen: readonly Fakt[], e: KennzahlenEinstellungen, heute: string) {
  const grenze = plusTage(heute, -e.alt_tage)
  const standVon = (f: Fakt) =>
    f.datum && f.datum < grenze ? 'alt' : f.stand === 'nachfassen' || f.stand === 'vertagt' ? f.stand : 'offeriert'
  return PIPELINE_STAENDE.map((s) => {
    const z = offen.filter((f) => standVon(f) === s)
    const wert = summe(z)
    const prozent = e.wahrscheinlichkeit[s]
    return { id: s, fakten: z, wert, prozent, gewichtet: Math.round((wert * prozent) / 100) }
  })
}

/** Alter der offenen Offerten in Klassen (Tage seit Versand). */
export const ALTERSKLASSEN = [
  { id: 'a14', bis: 14 },
  { id: 'a30', bis: 30 },
  { id: 'a60', bis: 60 },
  { id: 'a90', bis: 90 },
  { id: 'aMehr', bis: Infinity },
] as const

/** Offene Offerten je Altersklasse und Standort. */
export function alterKlassen(offen: readonly Fakt[], heute: string) {
  const alter = (f: Fakt) =>
    f.datum ? Math.round((Date.parse(`${heute}T00:00:00Z`) - Date.parse(`${f.datum}T00:00:00Z`)) / 86_400_000) : 0
  let unten = -Infinity
  return ALTERSKLASSEN.map((k) => {
    const z = offen.filter((f) => alter(f) > unten && alter(f) <= k.bis)
    unten = k.bis
    return {
      id: k.id,
      fakten: z,
      muri: z.filter((f) => f.standort === 'muri'),
      bulle: z.filter((f) => f.standort === 'bulle'),
    }
  })
}
