import type { Offerte } from '../types'

/** Heute als ISO-Datum in Schweizer Zeit (ohne Uhrzeit). */
export function heuteIso(d: Date = new Date()): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** Tage von a nach b (beide ISO-Datum), ohne Sommerzeit-Fehler. */
export function tageZwischen(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000)
}

/** ISO-Datum in n Tagen. */
export function inTagen(n: number, ab: string = heuteIso()): string {
  const d = new Date(`${ab}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Was beim Nachfassen ansteht (V45): bald, heute, überfällig oder vertagt. */
export type NachfassArt = 'in' | 'heute' | 'faellig' | 'vertagt'

export interface NachfassStand {
  art: NachfassArt
  /** Tage bis fällig (art «in», «vertagt») oder seit fällig (art «faellig»). */
  tage: number
  datum: string | null
}

/**
 * Nachfass-Stand einer versendeten Offerte: 14 Tage nach dem Angebot fällig, oder am vertagten Datum.
 * Ergibt null, wenn die Offerte nicht (mehr) versendet ist.
 */
export function nachfassStand(
  o: Pick<Offerte, 'status' | 'faelligAm' | 'entscheid'>,
  heute = heuteIso(),
): NachfassStand | null {
  if (o.status !== 'offeriert') return null
  if (!o.faelligAm) return { art: 'faellig', tage: 0, datum: null }
  const tage = tageZwischen(heute, o.faelligAm)
  if (tage === 0) return { art: 'heute', tage: 0, datum: o.faelligAm }
  if (tage < 0) return { art: 'faellig', tage: -tage, datum: o.faelligAm }
  return { art: o.entscheid === 'vertagt' ? 'vertagt' : 'in', tage, datum: o.faelligAm }
}

/** Filter «Fällig seit» aus V193. */
export type FaelligSeit = 'alle' | 'bald' | 'bis30' | 'bis90' | 'bis180' | 'mehr180'

export const FAELLIG_SEIT: readonly FaelligSeit[] = ['alle', 'bald', 'bis30', 'bis90', 'bis180', 'mehr180']

/** Passt eine Offerte in den Filter «Fällig seit»? «bald» = in den nächsten 14 Tagen fällig. */
export function passtFaelligSeit(s: NachfassStand | null, filter: FaelligSeit): boolean {
  if (!s) return false
  if (filter === 'alle') return s.art === 'faellig' || s.art === 'heute'
  if (filter === 'bald') return (s.art === 'in' || s.art === 'vertagt') && s.tage <= 14
  if (s.art !== 'faellig' && s.art !== 'heute') return false
  const t = s.tage
  if (filter === 'bis30') return t <= 30
  if (filter === 'bis90') return t > 30 && t <= 90
  if (filter === 'bis180') return t > 90 && t <= 180
  return t > 180
}

export type NachfassSortierung = 'neu' | 'alt' | 'betrag' | 'name' | 'nr'

/** Sortierung der Nachfass-Liste (V193): neueste Fälligkeit, älteste, Betrag, Name, Nummer. */
export function sortiereNachfassen(liste: Offerte[], wie: NachfassSortierung): Offerte[] {
  const kopie = [...liste]
  const datum = (o: Offerte) => o.faelligAm ?? ''
  switch (wie) {
    case 'neu':
      return kopie.sort((a, b) => datum(b).localeCompare(datum(a)))
    case 'alt':
      return kopie.sort((a, b) => datum(a).localeCompare(datum(b)))
    case 'betrag':
      return kopie.sort((a, b) => (b.betragRappen ?? 0) - (a.betragRappen ?? 0))
    case 'name':
      return kopie.sort((a, b) => a.name.localeCompare(b.name, 'de-CH'))
    case 'nr':
      return kopie.sort((a, b) => a.nummer.localeCompare(b.nummer, 'de-CH', { numeric: true }))
  }
}

/** Kennzahlen über der Nachfass-Liste: Anzahl fällig, davon heute, Summe offen. */
export function nachfassKennzahlen(liste: Offerte[], heute = heuteIso()) {
  let faellig = 0
  let heuteZahl = 0
  let bald = 0
  let summe = 0
  for (const o of liste) {
    const s = nachfassStand(o, heute)
    if (!s) continue
    if (s.art === 'faellig' || s.art === 'heute') {
      faellig++
      summe += o.betragRappen ?? 0
    }
    if (s.art === 'heute') heuteZahl++
    if ((s.art === 'in' || s.art === 'vertagt') && s.tage <= 14) bald++
  }
  return { faellig, heute: heuteZahl, bald, summeRappen: summe }
}
