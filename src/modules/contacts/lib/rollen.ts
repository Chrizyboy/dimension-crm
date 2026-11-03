import { formatChf, formatDatum, formatTelefon, parseChf } from '@/lib/format'
import type { Auswahlwert } from '@/types/kontakt'
import type { Feldtyp, Partnerzeile, Rollenfeld } from '../types'

const FELDTYPEN = new Set<Feldtyp>(['text', 'lang', 'url', 'email', 'telefon', 'zahl', 'prozent', 'chf', 'datum'])

/**
 * Felder einer Rolle aus der Auswahlliste «partnerrolle» (eigenschaften.felder). Unbekannte Typen werden zu Text,
 * damit eine neue Angabe der Administration nie die Akte zerbricht.
 */
export function rollenfelder(wert: Auswahlwert | undefined): Rollenfeld[] {
  const roh = wert?.eigenschaften.felder
  if (!Array.isArray(roh)) return []
  return roh.flatMap((f: unknown) => {
    if (!f || typeof f !== 'object') return []
    const o = f as Record<string, unknown>
    if (typeof o.k !== 'string' || !o.k) return []
    const t = FELDTYPEN.has(o.t as Feldtyp) ? (o.t as Feldtyp) : 'text'
    return [{ k: o.k, t, de: typeof o.de === 'string' ? o.de : o.k, fr: typeof o.fr === 'string' ? o.fr : o.k }]
  })
}

/** Gespeicherter Wert als Text (Zahlen und Texte direkt, alles andere als JSON). */
function alsText(wert: unknown): string {
  if (typeof wert === 'string') return wert
  if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert)
  return JSON.stringify(wert)
}

/** Wert eines Rollen-Felds für die Anzeige; leer → null. */
export function feldAnzeige(feld: Rollenfeld, wert: unknown): string | null {
  if (wert === null || wert === undefined || wert === '') return null
  switch (feld.t) {
    case 'chf':
      return typeof wert === 'number' ? formatChf(wert, { mitWaehrung: true }) : alsText(wert)
    case 'prozent':
      return `${alsText(wert)} %`
    case 'datum':
      return typeof wert === 'string' && /^\d{4}-\d{2}-\d{2}/.test(wert) ? formatDatum(wert) : alsText(wert)
    case 'telefon':
      return formatTelefon(alsText(wert))
    default:
      return alsText(wert)
  }
}

/** Wert als Text für das Eingabefeld (Rappen als Franken, Zahlen ohne Einheit). */
export function feldAlsText(feld: Rollenfeld, wert: unknown): string {
  if (wert === null || wert === undefined) return ''
  if (feld.t === 'chf' && typeof wert === 'number') return formatChf(wert)
  return alsText(wert)
}

/**
 * Eingabe in den gespeicherten Wert: Franken → Rappen, Zahlen als Zahl, sonst getrimmter Text.
 * Gibt `{ fehler: true }` zurück, wenn eine Zahl oder ein Betrag nicht lesbar ist.
 */
export function feldEingabe(feld: Rollenfeld, text: string): { wert: unknown; fehler: boolean } {
  const t = text.trim()
  if (!t) return { wert: null, fehler: false }
  if (feld.t === 'chf') {
    const r = parseChf(t)
    return { wert: r, fehler: r === null }
  }
  if (feld.t === 'zahl' || feld.t === 'prozent') {
    const n = Number(t.replace(',', '.').replace(/\s*%$/, ''))
    return { wert: Number.isFinite(n) ? n : null, fehler: !Number.isFinite(n) }
  }
  if (feld.t === 'url' && !/^https?:\/\//i.test(t)) return { wert: `https://${t}`, fehler: false }
  return { wert: t, fehler: false }
}

/** Wie viele Partner je Rolle (für die Filterchips). */
export function rollenZaehlen(zeilen: Pick<Partnerzeile, 'rollen'>[]): Record<string, number> {
  const z: Record<string, number> = {}
  for (const p of zeilen) for (const r of p.rollen) z[r] = (z[r] ?? 0) + 1
  return z
}

/** Stand eines Nachweises: abgelaufen, läuft bald ab (innert `vorlauf` Tagen), gültig oder ohne Datum. */
export function nachweisStand(
  gueltigBis: string | null,
  heute: string,
  vorlauf = 30,
): 'abgelaufen' | 'bald' | 'ok' | 'ohne' {
  if (!gueltigBis) return 'ohne'
  if (gueltigBis < heute) return 'abgelaufen'
  const grenze = new Date(`${heute}T12:00:00Z`)
  grenze.setUTCDate(grenze.getUTCDate() + vorlauf)
  return gueltigBis <= grenze.toISOString().slice(0, 10) ? 'bald' : 'ok'
}

/** Zahlen über der Liste: Partner, Gesuche über der Frist, Nachweise bald fällig, laufende Aufträge. */
export function listenZahlen(zeilen: Partnerzeile[], heute: string) {
  return {
    partner: zeilen.length,
    gesucheAlt: zeilen.reduce((s, p) => s + p.gesucheAlt, 0),
    gesucheOffen: zeilen.reduce((s, p) => s + p.gesucheOffen, 0),
    nachweiseFaellig: zeilen.filter((p) => ['abgelaufen', 'bald'].includes(nachweisStand(p.nachweisBis, heute))).length,
    auftraegeLaufend: zeilen.reduce((s, p) => s + p.auftraegeLaufend, 0),
  }
}

/** Schreibt eine UID einheitlich als «CHE-123.456.789»; ohne 9 Ziffern bleibt der Text, wie er ist. */
export function normalisiereUid(text: string): string {
  const ziffern = text.replace(/\D/g, '')
  if (ziffern.length !== 9) return text.trim()
  return `CHE-${ziffern.slice(0, 3)}.${ziffern.slice(3, 6)}.${ziffern.slice(6)}`
}

/** Prüft die Prüfziffer der UID (Modulo 11, Gewichte 5 4 3 2 7 6 5 4). */
export function uidGueltig(text: string): boolean {
  const m = /^CHE-?(\d{3})\.?(\d{3})\.?(\d{3})$/i.exec(text.trim().replace(/\s+(MWST|TVA|HR|RC)$/i, ''))
  if (!m) return false
  const [, a = '', b = '', c = ''] = m
  const z = (a + b + c).split('').map(Number)
  const summe = [5, 4, 3, 2, 7, 6, 5, 4].reduce((s, g, i) => s + g * (z[i] ?? 0), 0)
  const pruef = 11 - (summe % 11)
  if (pruef === 10) return false
  return (pruef === 11 ? 0 : pruef) === z[8]
}

/** Mittelwert der Bewertung als Sterne-Text, z. B. 4.3 → «4.3 ★». */
export function bewertungText(wert: number | null): string | null {
  return wert === null ? null : `${wert.toFixed(1)} ★`
}
