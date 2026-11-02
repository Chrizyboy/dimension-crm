import { plusTage, wochentag } from './faelligkeit'

/** Ergebnis der Schnelleingabe: Titel ohne die erkannten Wörter, dazu Datum, Person und «wichtig». */
export interface Schnelleingabe {
  titel: string
  faellig_am: string | null
  /** Kurzzeichen oder Vorname nach «@», noch nicht geprüft. */
  person: string | null
  wichtig: boolean
}

const RELATIV: Record<string, number> = {
  heute: 0,
  "aujourd'hui": 0,
  morgen: 1,
  demain: 1,
  übermorgen: 2,
  uebermorgen: 2,
  'après-demain': 2,
}

// Nur ausgeschriebene Wochentage oder Abkürzungen mit Punkt: «so», «do» oder «mi» sind sonst gewöhnliche Wörter.
const TAGE: Record<string, number> = {
  montag: 1,
  'mo.': 1,
  lundi: 1,
  'lu.': 1,
  dienstag: 2,
  'di.': 2,
  mardi: 2,
  'ma.': 2,
  mittwoch: 3,
  'mi.': 3,
  mercredi: 3,
  'me.': 3,
  donnerstag: 4,
  'do.': 4,
  jeudi: 4,
  'je.': 4,
  freitag: 5,
  'fr.': 5,
  vendredi: 5,
  've.': 5,
  samstag: 6,
  'sa.': 6,
  samedi: 6,
  sonntag: 7,
  'so.': 7,
  dimanche: 7,
}

/** «12.11.», «12.11.2026», «3.1.27» → JJJJ-MM-TT; ohne Jahr das nächste solche Datum ab heute. */
function datumAus(wort: string, heute: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})?$/.exec(wort)
  if (!m) return null
  const tag = Number(m[1])
  const monat = Number(m[2])
  if (tag < 1 || tag > 31 || monat < 1 || monat > 12) return null
  const zwei = (n: number) => String(n).padStart(2, '0')
  let jahr = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(heute.slice(0, 4))
  let d = `${jahr}-${zwei(monat)}-${zwei(tag)}`
  if (!m[3] && d < heute) {
    jahr += 1
    d = `${jahr}-${zwei(monat)}-${zwei(tag)}`
  }
  return d
}

/**
 * Liest eine Zeile wie «Offerte Baumann nachfassen morgen @AM !»: Datum (heute, morgen, Wochentag, 12.11.),
 * Person nach «@» und «!» für wichtig. Was nicht erkannt wird, bleibt im Titel. Deutsch und Französisch.
 */
export function leseSchnelleingabe(zeile: string, heute: string): Schnelleingabe {
  let faellig: string | null = null
  let person: string | null = null
  let wichtig = false
  const rest: string[] = []
  for (const wort of zeile.trim().split(/\s+/).filter(Boolean)) {
    const klein = wort.toLowerCase()
    if (wort === '!' || wort === '!!') {
      wichtig = true
    } else if (/^@[\p{L}\d_.-]+$/u.test(wort) && !person) {
      person = wort.slice(1)
    } else if (!faellig && klein in RELATIV) {
      faellig = plusTage(heute, RELATIV[klein] ?? 0)
    } else if (!faellig && klein in TAGE) {
      const ziel = TAGE[klein] ?? 1
      const abstand = (ziel - wochentag(heute) + 7) % 7 || 7
      faellig = plusTage(heute, abstand)
    } else if (!faellig && datumAus(wort, heute)) {
      faellig = datumAus(wort, heute)
    } else if (wort.endsWith('!') && wort.length > 1 && !wichtig) {
      wichtig = true
      rest.push(wort.slice(0, -1))
    } else {
      rest.push(wort)
    }
  }
  return { titel: rest.join(' '), faellig_am: faellig, person, wichtig }
}

/** Kurzzeichen aus dem Namen: erster Buchstabe von Vor- und Nachname («Loris Pisciotta» → «LP»). */
export function kurzzeichen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  const erste = teile[0]?.[0] ?? ''
  const letzte = teile.length > 1 ? (teile[teile.length - 1]?.[0] ?? '') : ''
  return (erste + letzte).toUpperCase()
}

/** Person zu «@…»: Kurzzeichen («LP», aus dem Namen oder gespeichert), sonst eindeutiger Vorname. */
export function findePerson<P extends { kuerzel: string; name: string }>(text: string | null, personen: P[]): P | null {
  if (!text) return null
  const k = text.toLowerCase()
  const genau = personen.filter((p) => p.kuerzel.toLowerCase() === k || kurzzeichen(p.name).toLowerCase() === k)
  if (genau.length === 1) return genau[0] ?? null
  const vorname = personen.filter((p) => p.name.toLowerCase().split(/\s+/)[0] === k)
  return vorname.length === 1 ? (vorname[0] ?? null) : null
}
