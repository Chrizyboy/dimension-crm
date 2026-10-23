import type { Aktion, AktionsArt, Automation, Katalog, LaufStand, Operator, Wert } from '../types'

type Ton = 'neutral' | 'marke' | 'ok' | 'warnung' | 'kritisch' | 'info'

/** Farbe je Stand eines Laufs. */
export const STAND_TON: Record<LaufStand, Ton> = {
  laeuft: 'info',
  wartet: 'marke',
  server: 'info',
  fertig: 'ok',
  uebersprungen: 'neutral',
  fehler: 'kritisch',
  abgebrochen: 'neutral',
}

/** Offene Läufe kann die Administration abbrechen. */
export const OFFEN: readonly LaufStand[] = ['laeuft', 'wartet', 'server']

/** Operatoren ohne Wert. */
export const OHNE_WERT: readonly Operator[] = ['leer', 'nicht_leer']

/**
 * Eingabe im Feld «Wert» lesen: «ja/nein/true/false» als Wahrheitswert, Zahlen als Zahl,
 * bei «in» eine Liste mit Komma. So bleibt die Bedingung in der Datenbank typgerecht.
 */
export function wertLesen(text: string, op: Operator): Wert | undefined {
  if (OHNE_WERT.includes(op)) return undefined
  const einzeln = (t: string): string | number | boolean => {
    const s = t.trim()
    if (/^(true|ja|oui)$/i.test(s)) return true
    if (/^(false|nein|non)$/i.test(s)) return false
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
    return s
  }
  if (op === 'in') {
    return text
      .split(',')
      .map((t) => einzeln(t))
      .filter((w): w is string | number => typeof w !== 'boolean' && w !== '')
  }
  return einzeln(text)
}

/** Wert für das Eingabefeld (Gegenstück zu wertLesen). */
export function wertText(wert: Wert | undefined): string {
  if (wert === undefined || wert === null) return ''
  if (Array.isArray(wert)) return wert.join(', ')
  return String(wert)
}

/** Welche Angaben eine Aktion im Editor hat. */
export interface AktionsFelder {
  an?: boolean
  absender?: boolean
  titel?: boolean
  text?: boolean
  betreff?: boolean
  faellig?: boolean
  stufe?: boolean
  tage?: boolean
  bedingungen?: boolean
  sende?: boolean
  werbung?: boolean
  tranche?: boolean
  merkmal?: boolean
}

const FELDER: Record<AktionsArt, AktionsFelder> = {
  aufgabe: { an: true, titel: true, text: true, faellig: true },
  benachrichtigung: { an: true, titel: true, text: true, stufe: true },
  mail: { absender: true, betreff: true, text: true, werbung: true },
  sms: { absender: true, text: true, sende: true, werbung: true },
  zahlungserinnerung: { absender: true, betreff: true, text: true },
  warten: { tage: true },
  pruefen: { bedingungen: true },
  dubletten: { an: true },
  zuteilen: {},
  rechnung_entwurf: { tranche: true },
  zielgruppe: { an: true, titel: true, merkmal: true },
  outlook_termin: {},
  sharepoint_ordner: {},
  abaninja_kunde: {},
}

/** Angaben der Aktion im Editor. */
export function aktionsFelder(art: AktionsArt): AktionsFelder {
  return FELDER[art]
}

/** Neue Aktion mit vernünftigen Vorgaben (Empfänger «zuständig», sonst Administration). */
export function neueAktion(art: AktionsArt): Aktion {
  const f = FELDER[art]
  const leer = { de: '', fr: '' }
  return {
    art,
    ...(f.an ? { an: ['zustaendig', 'rolle:admin'] } : {}),
    ...(f.titel ? { titel: { ...leer } } : {}),
    ...(f.text ? { text: { ...leer } } : {}),
    ...(f.betreff ? { betreff: { ...leer } } : {}),
    ...(f.faellig ? { faellig_tage: 1 } : {}),
    ...(f.tage ? { tage: 3 } : {}),
    ...(f.bedingungen ? { bedingungen: [] } : {}),
    ...(f.tranche ? { tranche: 'erste' as const } : {}),
    ...(f.merkmal ? { merkmal: 'ohne_batterie' } : {}),
  }
}

/** Tabelle des Auslösers; bestimmt, welche Felder Bedingungen prüfen können. */
export function tabelleVon(katalog: Katalog, ausloeser: string): string {
  return katalog.ereignisse.find((e) => e.schluessel === ausloeser)?.tabelle ?? 'keine'
}

/** Geht etwas nach aussen (Mail, SMS, Mahnung)? Dann zeigt die Liste den Modus deutlich. */
export function gehtNachAussen(a: Pick<Automation, 'aktionen'>, katalog: Katalog | undefined): boolean {
  const aussen = new Set(
    katalog?.aktionen.filter((k) => k.nach_aussen).map((k) => k.art) ?? ['mail', 'sms', 'zahlungserinnerung'],
  )
  return a.aktionen.some((x) => aussen.has(x.art))
}

/** Platzhalter im Text, die es nicht gibt (Tippfehler wie «{Vornam}»), damit der Editor warnen kann. */
export function unbekanntePlatzhalter(text: string, bekannt: readonly string[]): string[] {
  const gefunden = [...text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1] ?? '')
  return [...new Set(gefunden.filter((p) => !bekannt.includes(p)))]
}

/** Dauer aller Wartezeiten einer Automation in Tagen (für «läuft bis zu … Tage»). */
export function wartetageTotal(aktionen: readonly Aktion[]): number {
  return aktionen.reduce((s, x) => s + (x.art === 'warten' ? (x.tage ?? 0) : 0), 0)
}
