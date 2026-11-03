import type { Pruefpunkt } from '../types'

/** Ausschnitt aus `einstellungen.wartung_pakete`, den die Inspektion braucht. */
export interface PaketEinstellung {
  pakete?: { id: string; messung?: boolean }[]
  pruefpunkte?: Pruefpunkt[]
  abweichung_prozent?: number
}

/**
 * Prüfpunkte für das Paket des Vertrags: Messungen (`nur_messung`) nur, wenn das Paket sie enthält. Alte Verträge ohne
 * Paket bekommen alle Punkte, damit nichts fehlt.
 */
export function pruefpunkteFuer(e: PaketEinstellung, paket: string | null): Pruefpunkt[] {
  const punkte = e.pruefpunkte ?? []
  if (!paket) return punkte
  const messung = e.pakete?.find((p) => p.id === paket)?.messung === true
  return punkte.filter((p) => messung || !p.nur_messung)
}

/** Zahl aus einer Eingabe am Handy («1'250,5» oder «1250.5»); keine Zahl → null. */
export function zahl(w: unknown): number | null {
  if (typeof w !== 'string' && typeof w !== 'number') return null
  const n = Number(String(w).replace(/['\s]/g, '').replace(',', '.'))
  return String(w).trim() === '' || Number.isNaN(n) ? null : n
}

/**
 * Abweichung zum Vorjahr in Prozent (gerundet), nur wenn sie die Schwelle überschreitet; sonst null. Ohne Vorjahr
 * oder bei Vorjahr 0 gibt es keinen Vergleich.
 */
export function abweichung(jetzt: unknown, vorher: unknown, schwelle: number): number | null {
  const a = zahl(jetzt)
  const b = zahl(vorher)
  if (a == null || b == null || b === 0) return null
  const prozent = Math.round(((a - b) / Math.abs(b)) * 100)
  return Math.abs(prozent) > schwelle ? prozent : null
}
