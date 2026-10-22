/** Prozent als Text ohne unnötige Stellen: 0.25 → «25», 0.015 → «1.5». */
export function prozentText(anteil: number | null): string {
  return anteil === null ? '' : String(Math.round(anteil * 1000) / 10)
}

/** Liest «25», «1,5» oder «1.5 %» als Anteil (0.25, 0.015); leer → null. */
export function leseProzent(text: string): number | null {
  const t = text.replace('%', '').replace(',', '.').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 10) / 1000 : null
}
