import type { Eingang, Offerte, OffertAnsicht } from '../types'

/** Trifft der Suchtext? Mehrere Wörter müssen alle vorkommen (Name und Ort, Nummer …). */
export function treffer(suchtext: string, suche: string): boolean {
  const woerter = suche.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return woerter.every((w) => suchtext.includes(w))
}

/** Gehört die Offerte in die Liste Muri bzw. Bulle? V185: was noch in «Neue Offerten» liegt, nicht. */
export function inListe(o: Offerte, standort: 'muri' | 'bulle'): boolean {
  return !o.imEingang && (o.standort ?? (o.sprache === 'fr' ? 'bulle' : 'muri')) === standort
}

/** Versendet und nicht entschieden: gehört ins Nachfassen. */
export function imNachfassen(o: Offerte): boolean {
  return o.status === 'offeriert' && !o.imEingang
}

/** Treffer je Reiter (V186), für die Zahl am Reiter. */
export function zaehleTreffer(
  offerten: Offerte[],
  eingang: Eingang[],
): Record<Exclude<OffertAnsicht, 'import'>, number> {
  return {
    eingang: eingang.filter((e) => e.status !== 'offeriert').length,
    muri: offerten.filter((o) => inListe(o, 'muri')).length,
    bulle: offerten.filter((o) => inListe(o, 'bulle')).length,
    nachfassen: offerten.filter(imNachfassen).length,
  }
}
