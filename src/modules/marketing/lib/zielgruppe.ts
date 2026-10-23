import { formatKundennummer } from '@/lib/kontakt'
import type { Gruppe, Sprache, ZielFilter, Zielkontakt } from '../types'

/** Leerer Filter: alle Gruppen, Abgemeldete ausgeblendet (V233). */
export const LEERER_FILTER: ZielFilter = {
  suche: '',
  gruppen: [],
  kantone: [],
  sprache: '',
  standort: '',
  kontakt: '',
  anlage: '',
  abgemeldete: false,
}

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Hat eine brauchbare Mail-Adresse. */
export const mitMail = (k: Pick<Zielkontakt, 'email'>) => MAIL.test(k.email?.trim() ?? '')
/** Hat eine vollständige Postadresse (Strasse, PLZ, Ort). */
export const mitPost = (k: Pick<Zielkontakt, 'strasse' | 'plz' | 'ort'>) =>
  Boolean(k.strasse?.trim() && k.plz?.trim() && k.ort?.trim())

/** Jahre seit der Anlage (IBN oder Unterschrift), null ohne Anlage. */
export function anlageJahre(k: Pick<Zielkontakt, 'anlage_seit'>, heute = new Date()): number | null {
  if (!k.anlage_seit) return null
  return (heute.getTime() - Date.parse(k.anlage_seit)) / (365.25 * 86_400_000)
}

/**
 * Filtert die Zielgruppe wie V233. «ohne» (z. B. Gruppe) wird übersprungen, damit die Chips daneben zählen
 * können, was jeder Wert bringen würde.
 */
export function filtern(
  liste: readonly Zielkontakt[],
  f: ZielFilter,
  ohne: 'gruppen' | 'kantone' | null = null,
  heute = new Date(),
): Zielkontakt[] {
  const q = f.suche.trim().toLowerCase()
  return liste.filter((k) => {
    if (!f.abgemeldete && k.werbesperre) return false
    if (ohne !== 'gruppen' && f.gruppen.length && !f.gruppen.includes(k.gruppe)) return false
    if (ohne !== 'kantone' && f.kantone.length && !f.kantone.includes(k.kanton ?? '')) return false
    if (f.sprache && k.sprache !== f.sprache) return false
    if (f.standort && k.standort !== f.standort) return false
    if (f.kontakt === 'mail' && !mitMail(k)) return false
    if (f.kontakt === 'post' && !mitPost(k)) return false
    // Anlage-Filter gelten nur für Kunden mit Anlage (V233: «Auftrag»)
    if (f.anlage) {
      if (k.gruppe !== 'kunde') return false
      if (f.anlage === 'ohne_batterie' && k.batterie) return false
      if (f.anlage === 'ohne_wallbox' && k.wallbox) return false
      if (f.anlage === 'ohne_waermepumpe' && k.waermepumpe) return false
      if (f.anlage === 'alt' && (anlageJahre(k, heute) ?? 0) < 3) return false
    }
    if (q) {
      const text = [k.name, k.firma, k.email, k.ort, k.plz, k.strasse, formatKundennummer(k.kundennummer)]
        .join(' ')
        .toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })
}

/** Zählt je Wert (Gruppe oder Kanton) für die Filterchips. */
export function zaehlen(liste: readonly Zielkontakt[], feld: 'gruppe' | 'kanton'): Map<string, number> {
  const m = new Map<string, number>()
  for (const k of liste) {
    const w = k[feld] ?? ''
    if (w) m.set(w, (m.get(w) ?? 0) + 1)
  }
  return m
}

/** Für Brief oder Mail brauchbar, ohne Abgemeldete, jede Adresse nur einmal (V233 «Duplikate entfernt»). */
export function empfaenger(
  liste: readonly Zielkontakt[],
  art: 'brief' | 'mail',
): { liste: Zielkontakt[]; doppelt: number; ohne: number } {
  const gesehen = new Set<string>()
  const ergebnis: Zielkontakt[] = []
  let doppelt = 0
  let ohne = 0
  for (const k of liste) {
    if (k.werbesperre) continue
    if (art === 'mail' ? !mitMail(k) : !mitPost(k)) {
      ohne++
      continue
    }
    const schluessel =
      art === 'mail'
        ? (k.email ?? '').trim().toLowerCase()
        : [k.name, k.strasse, k.plz].map((x) => (x ?? '').trim().toLowerCase()).join('|')
    if (gesehen.has(schluessel)) {
      doppelt++
      continue
    }
    gesehen.add(schluessel)
    ergebnis.push(k)
  }
  return { liste: ergebnis, doppelt, ohne }
}

type Person = Pick<Zielkontakt, 'vorname' | 'nachname' | 'firma' | 'name'>

/** Anrede wie V233: «Guten Tag Vorname Nachname» / «Bonjour Vorname Nachname,»; ohne Person die Firmenformel. */
export function anrede(k: Person, sprache: Sprache): string {
  const name = [k.vorname, k.nachname]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(' ')
  if (sprache === 'fr') return k.vorname?.trim() ? `Bonjour ${name},` : 'Madame, Monsieur,'
  return k.vorname?.trim() ? `Guten Tag ${name}` : 'Sehr geehrte Damen und Herren'
}

/** Platzhalter, die in Vorlagen erlaubt sind (V233 plus Abmeldelink). */
export const PLATZHALTER = [
  'Anrede',
  'Vorname',
  'Nachname',
  'Name',
  'Firma',
  'Strasse',
  'PLZ',
  'Ort',
  'Kundennummer',
  'Absender',
  'Abmeldelink',
] as const

/** Setzt die Platzhalter {Anrede}, {Name} … für einen Empfänger ein; unbekannte bleiben stehen. */
export function fuellen(
  text: string,
  k: Person & Partial<Pick<Zielkontakt, 'strasse' | 'plz' | 'ort' | 'kundennummer'>>,
  sprache: Sprache,
  extra: { absender?: string; abmeldelink?: string } = {},
): string {
  const werte: Record<string, string> = {
    Anrede: anrede(k, sprache),
    Vorname: k.vorname ?? '',
    Nachname: k.nachname ?? '',
    Name: k.name || [k.vorname, k.nachname].filter(Boolean).join(' '),
    Firma: k.firma ?? '',
    Strasse: k.strasse ?? '',
    PLZ: k.plz ?? '',
    Ort: k.ort ?? '',
    Kundennummer: formatKundennummer(k.kundennummer ?? null),
    Absender: extra.absender ?? 'Dimension Solaire',
    Abmeldelink: extra.abmeldelink ?? '',
  }
  return text.replace(/\{(\w+)\}/g, (ganz, name: string) => werte[name] ?? ganz)
}

/** Adressliste als CSV wie V233 (Strichpunkt, BOM für Excel). */
export function adresslisteCsv(
  liste: readonly Zielkontakt[],
  gruppeText: (g: Gruppe) => string,
  standortText: (s: string | null) => string,
): string {
  const kopf = [
    'Kundennummer',
    'Firma',
    'Vorname',
    'Nachname',
    'z.Hd.',
    'Strasse',
    'PLZ',
    'Ort',
    'Kanton',
    'Sprache',
    'E-Mail',
    'Telefon',
    'Gruppe',
    'Standort',
  ]
  const feld = (w: string | null | undefined) => {
    const s = (w ?? '').replace(/\r?\n/g, ' ')
    return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const zeilen = liste.map((k) =>
    [
      formatKundennummer(k.kundennummer),
      k.firma,
      k.vorname,
      k.nachname,
      k.firma && k.vorname ? [k.vorname, k.nachname].filter(Boolean).join(' ') : '',
      k.strasse,
      k.plz,
      k.ort,
      k.kanton,
      k.sprache.toUpperCase(),
      k.email,
      k.telefon,
      gruppeText(k.gruppe),
      standortText(k.standort),
    ]
      .map(feld)
      .join(';'),
  )
  return '﻿' + [kopf.join(';'), ...zeilen].join('\r\n')
}
