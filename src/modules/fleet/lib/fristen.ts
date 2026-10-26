import type { Fahrzeug, Frist, FristStand } from '../types'

/** Heutiges Datum in Zürich als JJJJ-MM-TT (die Fristen sind Kalendertage, keine Zeitpunkte). */
export function heuteZuerich(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** Tage von heute bis zum Datum (negativ = vorbei). */
export function tageBis(datum: string, heute: string): number {
  return Math.round((Date.parse(`${datum}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 86_400_000)
}

/** Stand einer Frist: vorbei, innerhalb des Vorlaufs (Standard 30 Tage) oder später. Ohne Datum: ok. */
export function fristStand(datum: string | null, heute: string, vorlauf = 30): FristStand {
  if (!datum) return 'ok'
  const tage = tageBis(datum, heute)
  return tage < 0 ? 'ueberfaellig' : tage <= vorlauf ? 'bald' : 'ok'
}

/** Schlechtester Stand mehrerer Fristen (für ein Fahrzeug mit MFK und Service). */
export function schlechtester(staende: FristStand[]): FristStand {
  return staende.includes('ueberfaellig') ? 'ueberfaellig' : staende.includes('bald') ? 'bald' : 'ok'
}

/** Service fällig nach Kilometern: weniger als 1'000 km bis zum Service-Kilometerstand gilt als «bald». */
export function serviceKmStand(kmStand: number | null, serviceKm: number | null): FristStand {
  if (kmStand === null || serviceKm === null) return 'ok'
  const rest = serviceKm - kmStand
  return rest < 0 ? 'ueberfaellig' : rest < 1000 ? 'bald' : 'ok'
}

/**
 * Fristen für die Liste: nur bis «bis» Tage voraus (Vergangenes immer), früheste zuerst. Ausweise haben einen
 * längeren Vorlauf, weil ein Kurs Wochen vorher gebucht werden muss.
 */
export function anstehend(fristen: Frist[], heute: string, bis: number, bisAusweis = bis): Frist[] {
  return fristen
    .filter((f) => tageBis(f.faellig_am, heute) <= (f.art === 'ausweis' ? bisAusweis : bis))
    .sort((a, b) => a.faellig_am.localeCompare(b.faellig_am) || a.titel.localeCompare(b.titel))
}

/** Ist bei MFK, Service oder Kilometern etwas fällig (innerhalb 30 Tagen oder 1'000 km)? */
export const istFaellig = (f: Fahrzeug, heute: string): boolean =>
  !f.ausser_betrieb &&
  schlechtester([
    fristStand(f.naechste_mfk, heute),
    fristStand(f.naechster_service, heute),
    serviceKmStand(f.km_stand, f.service_km),
  ]) !== 'ok'
