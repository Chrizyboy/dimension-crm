/** Ein Textstück aus pdf.js: Text und Lage (transform[4] = x, transform[5] = y). */
export interface Textteil {
  str: string
  transform: number[]
  hasEOL?: boolean
}

/**
 * Setzt die Textstücke einer PDF-Seite wieder zu Zeilen zusammen: gleiche Höhe (± 2 pt) = eine Zeile,
 * von oben nach unten, innerhalb der Zeile von links nach rechts. Stücke mit Abstand werden mit
 * zwei Leerzeichen getrennt, damit «Rabatt (9%)   -3’231.65 CHF» lesbar bleibt.
 */
export function zeilenAusTextteilen(teile: readonly Textteil[]): string[] {
  const zeilen: { y: number; teile: { x: number; str: string }[] }[] = []
  for (const t of teile) {
    if (!t.str.trim()) continue
    const x = t.transform[4] ?? 0
    const y = t.transform[5] ?? 0
    const z = zeilen.find((zz) => Math.abs(zz.y - y) <= 2)
    if (z) z.teile.push({ x, str: t.str })
    else zeilen.push({ y, teile: [{ x, str: t.str }] })
  }
  return zeilen
    .sort((a, b) => b.y - a.y)
    .map((z) =>
      z.teile
        .sort((a, b) => a.x - b.x)
        .map((t) => t.str.trim())
        .join('  ')
        .trim(),
    )
}
