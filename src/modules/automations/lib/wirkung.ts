/** Arten, die die Übersicht einzeln zeigt (Schlüssel wie in automation_uebersicht.wirkung). */
export const WIRKUNG_ARTEN = ['aufgabe', 'mail', 'sms', 'benachrichtigt', 'rechnung_entwurf', 'wiedervorlage'] as const

/**
 * Erledigte Schritte und geschätzte Minuten (Minuten je Art aus einstellungen.automationen.minuten).
 * Gezählt wird nur, was eine Schätzung hat: «keine Dublette gefunden» spart niemandem Zeit.
 */
export function wirkungSumme(
  wirkung: Record<string, number>,
  minuten: Record<string, number>,
): { schritte: number; minuten: number } {
  let schritte = 0
  let summe = 0
  for (const [art, n] of Object.entries(wirkung)) {
    const m = minuten[art]
    if (m === undefined) continue
    schritte += n
    summe += n * m
  }
  return { schritte, minuten: summe }
}

/** «3 h 50 min», «45 min». */
export function dauerText(minuten: number): string {
  const h = Math.floor(minuten / 60)
  const m = Math.round(minuten % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
