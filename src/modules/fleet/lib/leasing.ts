import type { Eintrag, Fahrzeug } from '../types'
import { tageBis } from './fristen'

/** Hochrechnung der Kilometer im laufenden Leasingjahr gegen die Limite. */
export interface LeasingPrognose {
  jahrBeginn: string
  jahrEnde: string
  gefahren: number
  prognose: number
  limite: number
  /** Kilometer über der Limite (0, wenn darunter). */
  mehrKm: number
  /** Geschätzte Nachzahlung in Rappen (null ohne Preis pro Mehr-km). */
  mehrKostenRappen: number | null
}

/** Beginn des laufenden Leasingjahres: letzter Jahrestag des Leasingbeginns bis heute. */
export function leasingJahrBeginn(beginn: string, heute: string): string {
  const [j, m, t] = beginn.split('-').map(Number) as [number, number, number]
  const jahr = Number(heute.slice(0, 4))
  const kandidat = (y: number) => `${String(y)}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`
  return kandidat(Math.max(j, kandidat(jahr) <= heute ? jahr : jahr - 1))
}

/** Kilometerstand an einem Tag: letzter Eintrag davor, sonst der erste danach. */
export function kmAm(eintraege: Pick<Eintrag, 'datum' | 'km'>[], datum: string): number | null {
  const mitKm = eintraege.filter((e) => e.km !== null).sort((a, b) => a.datum.localeCompare(b.datum))
  const vorher = mitKm.filter((e) => e.datum <= datum).at(-1)
  return (vorher ?? mitKm.find((e) => e.datum > datum))?.km ?? null
}

/**
 * Prognose für ein Fahrzeug mit Leasing-Limite. Erst ab 30 Tagen im Leasingjahr, sonst ist die Hochrechnung
 * zu wackelig; ohne Leasingbeginn, Limite oder Kilometer gibt es keine.
 */
export function leasingPrognose(
  f: Pick<Fahrzeug, 'leasing_beginn' | 'leasing_bis' | 'leasing_km_jahr' | 'leasing_mehr_km_rappen' | 'km_stand'>,
  eintraege: Pick<Eintrag, 'datum' | 'km'>[],
  heute: string,
): LeasingPrognose | null {
  if (!f.leasing_beginn || !f.leasing_km_jahr || f.km_stand === null) return null
  if (f.leasing_bis && f.leasing_bis < heute) return null
  const beginn = leasingJahrBeginn(f.leasing_beginn, heute)
  const ende = `${String(Number(beginn.slice(0, 4)) + 1)}${beginn.slice(4)}`
  const tage = tageBis(heute, beginn)
  const start = kmAm(eintraege, beginn)
  if (tage < 30 || start === null) return null
  const gefahren = Math.max(f.km_stand - start, 0)
  const prognose = Math.round((gefahren / tage) * tageBis(ende, beginn))
  const mehrKm = Math.max(prognose - f.leasing_km_jahr, 0)
  return {
    jahrBeginn: beginn,
    jahrEnde: ende,
    gefahren,
    prognose,
    limite: f.leasing_km_jahr,
    mehrKm,
    mehrKostenRappen: f.leasing_mehr_km_rappen === null ? null : mehrKm * f.leasing_mehr_km_rappen,
  }
}
