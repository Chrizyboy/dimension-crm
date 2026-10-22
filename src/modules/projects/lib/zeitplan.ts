import type { Abwesenheit, Einsatz } from '../types'

/**
 * Rechnen für den Zeitplan (V233 «Bauplanung: Zeitplan»): Wochen, Werktage, Balken und Auslastung.
 * Daten sind immer «JJJJ-MM-TT» in Schweizer Ortszeit; gerechnet wird mit lokalen Mitternachts-Daten,
 * damit Sommerzeit-Wechsel keinen Tag verschieben.
 */

const TAG = 86_400_000

/** «JJJJ-MM-TT» zu einem lokalen Datum um Mitternacht. */
export function alsDatum(iso: string): Date {
  const [j, m, t] = iso.slice(0, 10).split('-').map(Number)
  return new Date(j ?? 1970, (m ?? 1) - 1, t ?? 1)
}

/** Lokales Datum zu «JJJJ-MM-TT». */
export function alsIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Tage dazuzählen (negativ = zurück). */
export function plusTage(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Montag der Woche. */
export function montag(d: Date): Date {
  return plusTage(d, -((d.getDay() + 6) % 7))
}

/** Kalenderwoche nach ISO 8601. */
export function kalenderwoche(d: Date): number {
  // Donnerstag derselben Woche bestimmt das Jahr; die Woche ist sein Jahrestag / 7.
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  x.setUTCDate(x.getUTCDate() + 3 - ((x.getUTCDay() + 6) % 7))
  return 1 + Math.floor((x.getTime() - Date.UTC(x.getUTCFullYear(), 0, 1)) / TAG / 7)
}

const istWerktag = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6

/** Werktage (Mo–Fr) von bis, beide mitgezählt. */
export function werktage(von: string, bis: string): number {
  let n = 0
  for (let d = alsDatum(von); d <= alsDatum(bis); d = plusTage(d, 1)) if (istWerktag(d)) n++
  return n
}

/** Erster Werktag am oder nach dem Datum. */
export function naechsterWerktag(d: Date): Date {
  let x = d
  while (!istWerktag(x)) x = plusTage(x, 1)
  return x
}

/** Ende eines Einsatzes, der am Datum beginnt und `n` Werktage dauert (mindestens einen). */
export function endeNachWerktagen(von: string, n: number): string {
  let d = alsDatum(von)
  let rest = Math.max(1, Math.ceil(n || 1)) - 1
  while (rest > 0) {
    d = plusTage(d, 1)
    if (istWerktag(d)) rest--
  }
  return alsIso(d)
}

/** Eine Woche im Zeitplan. */
export interface Woche {
  montag: string
  kw: number
  monat: number
  jahr: number
}

/** `anzahl` Wochen ab dem Montag vor `start`. */
export function wochen(start: Date, anzahl: number): Woche[] {
  const m = montag(start)
  return Array.from({ length: anzahl }, (_, i) => {
    const w = plusTage(m, i * 7)
    return { montag: alsIso(w), kw: kalenderwoche(w), monat: w.getMonth(), jahr: w.getFullYear() }
  })
}

/** Monate über den Wochen: Monat und wie viele Wochen er überspannt (Kopfzeile). */
export function monate(w: Woche[]): { monat: number; jahr: number; wochen: number }[] {
  const aus: { monat: number; jahr: number; wochen: number }[] = []
  for (const x of w) {
    const letzter = aus.at(-1)
    if (letzter?.monat === x.monat && letzter.jahr === x.jahr) letzter.wochen++
    else aus.push({ monat: x.monat, jahr: x.jahr, wochen: 1 })
  }
  return aus
}

/** Kurzer Monatsname mit Jahr für die Kopfzeile («Okt. 2026», «oct. 2026»). */
export function monatName(jahr: number, monat: number, sprache: 'de' | 'fr'): string {
  return new Date(jahr, monat, 1).toLocaleDateString(sprache === 'fr' ? 'fr-CH' : 'de-CH', {
    month: 'short',
    year: 'numeric',
  })
}

/** Lage eines Balkens im sichtbaren Bereich in Prozent, oder null, wenn er ganz ausserhalb liegt. */
export function balken(
  von: string,
  bis: string,
  start: string,
  tage: number,
): { links: number; breite: number } | null {
  const s = alsDatum(start).getTime()
  const a = (alsDatum(von).getTime() - s) / TAG
  const b = (alsDatum(bis).getTime() - s) / TAG + 1
  if (b <= 0 || a >= tage) return null
  const links = Math.max(0, a) / tage
  const rechts = Math.min(tage, b) / tage
  return { links: links * 100, breite: (rechts - links) * 100 }
}

/** Überschneiden sich zwei Zeiträume? */
export function ueberschneidet(a: { von: string; bis: string }, b: { von: string; bis: string }): boolean {
  return a.von <= b.bis && a.bis >= b.von
}

/** Auslastung einer Woche: Baustellen fest eingeplant, Personen eingeplant, Personen abwesend. */
export interface WochenAuslastung {
  baustellen: string[]
  personen: string[]
  abwesend: string[]
}

/**
 * Auslastung je Woche (Mo–Fr). «Voraussichtlich» zählt nicht, wie in V233. Abwesend ist, wer an mindestens
 * einem Werktag der Woche fehlt; ist er trotzdem eingeplant, steht er in beiden Listen (Konflikt).
 */
export function auslastung(w: Woche[], einsaetze: Einsatz[], abwesenheiten: Abwesenheit[]): WochenAuslastung[] {
  return w.map((x) => {
    const zeit = { von: x.montag, bis: alsIso(plusTage(alsDatum(x.montag), 4)) }
    const fest = einsaetze.filter((e) => e.art !== 'geplant' && ueberschneidet(e, zeit))
    return {
      baustellen: [...new Set(fest.map((e) => e.projekt_id))],
      personen: [...new Set(fest.flatMap((e) => e.personen))],
      abwesend: [...new Set(abwesenheiten.filter((a) => ueberschneidet(a, zeit)).map((a) => a.person_id))],
    }
  })
}

/** Personen, die in einem Einsatz stehen, aber in dieser Zeit abwesend sind. */
export function konflikte(e: Pick<Einsatz, 'von' | 'bis' | 'personen'>, abwesenheiten: Abwesenheit[]): string[] {
  return e.personen.filter((p) => abwesenheiten.some((a) => a.person_id === p && ueberschneidet(a, e)))
}
