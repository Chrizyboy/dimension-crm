/** Kleine Rechen- und Anzeigehilfen für Wartungsverträge (ohne React, darum testbar). */

/** Datum als JJJJ-MM-TT, `tage` nach `von`. */
export function inTagen(von: Date, tage: number): string {
  const d = new Date(von)
  d.setDate(d.getDate() + tage)
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Badge-Ton für die nächste Wartung: vorbei = kritisch, in 30 Tagen = Warnung, sonst neutral. */
export function wartungTon(naechste: string | null, heute: Date): 'kritisch' | 'warnung' | 'neutral' {
  if (!naechste) return 'neutral'
  if (naechste < inTagen(heute, 0)) return 'kritisch'
  return naechste <= inTagen(heute, 30) ? 'warnung' : 'neutral'
}

/** Vertragsende aus Start und Laufzeit (JJJJ-MM-TT) oder null. */
export function vertragsende(start: string | null, jahre: number): string | null {
  if (!start) return null
  const [j, m, t] = start.split('-').map(Number)
  if (!j || !m || !t) return null
  return inTagen(new Date(j + jahre, m - 1, t), -1)
}
