import { formatDatum } from '@/lib/format'
import type { AusweisArt, Kurs, Mitglied, Qualifikation, ZellenStand } from '../types'
import { istPflicht, zellenStand } from './matrix'

/** Kurse, die ein Ausweis-Problem schon lösen (bewilligt oder angemeldet), je «Person:Art». */
export function geplanteKurse(kurse: Kurs[]): Map<string, Kurs> {
  const karte = new Map<string, Kurs>()
  for (const k of kurse) {
    if (!k.art || (k.stand !== 'bewilligt' && k.stand !== 'angemeldet')) continue
    for (const p of k.personen) {
      const bisher = karte.get(`${p}:${k.art}`)
      // Der früheste Kurs zählt; ohne Datum hinten.
      if (!bisher || (k.von ?? '9999') < (bisher.von ?? '9999')) karte.set(`${p}:${k.art}`, k)
    }
  }
  return karte
}

/**
 * Stand einer Zelle mit Blick auf gebuchte Kurse: Fehlt, abgelaufen oder bald ablaufend, aber ein Kurs ist bewilligt
 * oder angemeldet, dann «geplant» (blau): das Problem ist in Arbeit und braucht keinen zweiten Kurs.
 */
export function zellenStandMitKurs(
  q: Qualifikation | undefined,
  pflicht: boolean,
  heute: string,
  kurs: Kurs | undefined,
): ZellenStand {
  const s = zellenStand(q, pflicht, heute)
  return kurs && (s === 'fehlt' || s === 'abgelaufen' || s === 'bald') ? 'geplant' : s
}

/** Vorschlag «Kurs planen»: je Art, wer ihn braucht (fehlt, abgelaufen, bald ablaufend) und noch keinen Kurs hat. */
export interface KursVorschlag {
  art: string
  personen: string[]
  fehlt: number
}

/** Vorschläge für Kurse, die meisten Personen zuerst (ein gemeinsamer Kurs ist günstiger als Einzeltermine). */
export function kursVorschlaege(
  personen: Mitglied[],
  arten: AusweisArt[],
  gueltig: Map<string, Qualifikation>,
  geplant: Map<string, Kurs>,
  heute: string,
): KursVorschlag[] {
  const liste: KursVorschlag[] = []
  for (const a of arten) {
    const v: KursVorschlag = { art: a.schluessel, personen: [], fehlt: 0 }
    for (const p of personen) {
      const k = `${p.id}:${a.schluessel}`
      if (geplant.has(k)) continue
      const s = zellenStand(gueltig.get(k), istPflicht(a, p.rolle), heute)
      if (s === 'fehlt' || s === 'abgelaufen' || (s === 'bald' && istPflicht(a, p.rolle))) {
        v.personen.push(p.id)
        if (s !== 'bald') v.fehlt += 1
      }
    }
    if (v.personen.length > 0) liste.push(v)
  }
  return liste.sort((x, y) => y.fehlt - x.fehlt || y.personen.length - x.personen.length)
}

/** Kosten aller nicht abgesagten Kurse (in Rappen), soweit sichtbar. */
export function kursKosten(kurse: Kurs[]): number {
  return kurse.reduce((s, k) => s + (k.stand === 'abgesagt' ? 0 : (k.kosten_rappen ?? 0)), 0)
}

/** Kurstage (Kalendertage je Person) der besuchten und angemeldeten Kurse. */
export function kursTage(kurse: Kurs[]): number {
  return kurse.reduce((s, k) => {
    if (!k.von || (k.stand !== 'besucht' && k.stand !== 'angemeldet')) return s
    const tage =
      Math.round((Date.parse(`${k.bis ?? k.von}T12:00:00Z`) - Date.parse(`${k.von}T12:00:00Z`)) / 86_400_000) + 1
    const wer = k.stand === 'besucht' ? k.besucht_von.length : k.personen.length
    return s + tage * wer
  }, 0)
}

/** Rückzahlung bei Austritt heute: linear abnehmend vom Kursende bis «Bindung bis» (0, wenn vorbei). */
export function offeneRueckzahlung(
  k: Pick<Kurs, 'bis' | 'von' | 'vereinbarung_rappen' | 'vereinbarung_bis'>,
  heute: string,
): number {
  if (!k.vereinbarung_rappen || !k.vereinbarung_bis) return 0
  const start = Date.parse(`${k.bis ?? k.von ?? heute}T12:00:00Z`)
  const ende = Date.parse(`${k.vereinbarung_bis}T12:00:00Z`)
  const jetzt = Date.parse(`${heute}T12:00:00Z`)
  if (jetzt >= ende) return 0
  if (jetzt <= start || ende <= start) return k.vereinbarung_rappen
  return Math.round((k.vereinbarung_rappen * (ende - jetzt)) / (ende - start) / 100) * 100
}

/** Das Wichtigste zu den Ausweisen einer Person für die Team-Liste: das dringendste Problem oder «alles gültig». */
export interface AusweisKurz {
  stand: ZellenStand
  art: string | null
  datum: string | null
  anzahl: number
}

const RANG: Record<ZellenStand, number> = { fehlt: 5, abgelaufen: 5, bald: 3, geplant: 2, gueltig: 0, leer: 0 }

/** Dringendstes Ausweis-Thema einer Person (fehlt/abgelaufen vor bald vor geplant), mit Zahl aller Themen. */
export function ausweisKurz(
  p: Mitglied,
  arten: AusweisArt[],
  gueltig: Map<string, Qualifikation>,
  geplant: Map<string, Kurs>,
  heute: string,
): AusweisKurz {
  let best: AusweisKurz = { stand: 'gueltig', art: null, datum: null, anzahl: 0 }
  for (const a of arten) {
    const k = `${p.id}:${a.schluessel}`
    const q = gueltig.get(k)
    const kurs = geplant.get(k)
    const s = zellenStandMitKurs(q, istPflicht(a, p.rolle), heute, kurs)
    if (RANG[s] === 0 || (s === 'bald' && !istPflicht(a, p.rolle))) continue
    best.anzahl += 1
    if (RANG[s] > RANG[best.stand]) {
      best = {
        stand: s,
        art: a.schluessel,
        datum: s === 'geplant' ? (kurs?.von ?? null) : (q?.gueltig_bis ?? null),
        anzahl: best.anzahl,
      }
    }
  }
  return best
}

/** Zeitraum eines Kurses (18.11.2026 oder 15.01.–16.01.2027), ohne Datum «offen». */
export function kursDatum(k: Pick<Kurs, 'von' | 'bis'>, offen: string): string {
  if (!k.von) return offen
  if (!k.bis || k.bis === k.von) return formatDatum(k.von)
  return `${formatDatum(k.von).slice(0, 6)}–${formatDatum(k.bis)}`
}
