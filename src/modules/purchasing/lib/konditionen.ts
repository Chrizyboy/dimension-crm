import { formatChf, parseChf } from '@/lib/format'
import type { Bestellweg, Lieferant } from '../types'
import { alsZahl } from './anzeige'

/** Konditionen als Text im Formular (Beträge in CHF, Tage und Prozent als Zahl). */
export interface Konditionen {
  fracht_frei_ab: string
  fracht: string
  mindestwert: string
  lieferzeit: string
  zahlungsziel: string
  skonto_prozent: string
  skonto_tage: string
  bestellschluss: string
  bestellweg: Bestellweg
  webshop_url: string
}

const chf = (r: number | null | undefined) => (r == null ? '' : formatChf(r))
const zahl = (n: number | null | undefined) => (n == null ? '' : String(n))

/** Konditionen eines Lieferanten für das Formular. */
export function konditionenAus(l: Lieferant | null): Konditionen {
  return {
    fracht_frei_ab: chf(l?.fracht_frei_ab_rappen),
    fracht: chf(l?.fracht_rappen),
    mindestwert: chf(l?.mindestbestellwert_rappen),
    lieferzeit: zahl(l?.lieferzeit_tage),
    zahlungsziel: zahl(l?.zahlungsziel_tage),
    skonto_prozent: zahl(l?.skonto_prozent),
    skonto_tage: zahl(l?.skonto_tage),
    bestellschluss: l?.bestellschluss ?? '',
    bestellweg: l?.bestellweg ?? 'mail',
    webshop_url: l?.webshop_url ?? '',
  }
}

/** Konditionen aus dem Formular in Spalten der Datenbank. */
export function konditionenZuDaten(k: Konditionen) {
  const ganz = (s: string) => {
    const n = alsZahl(s)
    return n == null ? null : Math.round(n)
  }
  return {
    fracht_frei_ab_rappen: k.fracht_frei_ab.trim() ? parseChf(k.fracht_frei_ab) : null,
    fracht_rappen: k.fracht.trim() ? parseChf(k.fracht) : null,
    mindestbestellwert_rappen: k.mindestwert.trim() ? parseChf(k.mindestwert) : null,
    lieferzeit_tage: ganz(k.lieferzeit),
    zahlungsziel_tage: ganz(k.zahlungsziel),
    skonto_prozent: alsZahl(k.skonto_prozent),
    skonto_tage: ganz(k.skonto_tage),
    bestellschluss: k.bestellschluss.trim() || null,
    bestellweg: k.bestellweg,
    webshop_url: k.webshop_url.trim() || null,
  }
}
