import type { z } from 'zod'

/**
 * Macht aus den Zod-Fehlern ein Objekt «Feld → übersetzter Text» für die Formulare.
 * Die Meldungen im Schema sind i18n-Schlüssel, darum wird hier übersetzt.
 */
export function feldFehler<T extends string>(
  issues: readonly z.core.$ZodIssue[],
  t: (schluessel: string) => string,
): Partial<Record<T, string>> {
  const fehler: Partial<Record<string, string>> = {}
  for (const i of issues) {
    const feld = i.path[0]
    if (typeof feld === 'string' && !fehler[feld]) fehler[feld] = t(i.message)
  }
  return fehler
}
