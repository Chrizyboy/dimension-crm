import type { FahrzeugKosten } from '../types'

/** Gesamtkosten eines Fahrzeugs (ohne Privatanteil, der ist eine Lohn-Angabe, keine Kosten). */
export const summe = (k: FahrzeugKosten): number =>
  k.leasing_rappen + k.treibstoff_rappen + k.unterhalt_rappen + k.fix_rappen + k.uebrige_rappen

/** Franken pro Kilometer, gerundet auf Rappen; ohne Kilometer null. */
export const proKm = (k: FahrzeugKosten): number | null => (k.km > 0 ? Math.round(summe(k) / k.km) / 100 : null)
