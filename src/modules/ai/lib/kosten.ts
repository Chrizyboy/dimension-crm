/** Tausendstel-Rappen in Rappen (gerundet), für `formatChf`. */
export function rappenAus(millirappen: number): number {
  return Math.round(millirappen / 1000)
}

/** Erster und letzter Tag eines Monats (JJJJ-MM) als JJJJ-MM-TT. */
export function monatsGrenzen(monat: string): { von: string; bis: string } {
  const [j, m] = monat.split('-').map(Number) as [number, number]
  const letzter = new Date(Date.UTC(j, m, 0)).getUTCDate()
  return { von: `${monat}-01`, bis: `${monat}-${String(letzter).padStart(2, '0')}` }
}

/** Anteil in Prozent (0–100) für Balken; ohne Limit 0. */
export function anteil(wert: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((wert / limit) * 100))
}
