import { createContext, isValidElement, useContext, type ReactNode } from 'react'

/**
 * Gilt ein angezeigter Wert als leer? Nichts, leerer Text oder der Platzhalter «–». Ein Eingabefeld zählt als leer,
 * wenn sein `wert`, `value` oder `defaultValue` leer ist (z. B. `FeldInline wert={null}`); Auswahlen mit einem
 * eigenen Platzhalter-Wert geben `leer` an der Zeile selbst an.
 */
export function istLeer(wert: ReactNode): boolean {
  if (wert === null || wert === undefined || wert === false) return true
  if (typeof wert === 'string') return ['', '–', '-'].includes(wert.trim())
  if (isValidElement(wert)) {
    const p = wert.props as Record<string, unknown>
    for (const k of ['wert', 'value', 'defaultValue'])
      if (k in p)
        return (
          p[k] === null ||
          p[k] === undefined ||
          (typeof p[k] === 'string' && ['', '–', '-', '_leer', '_ohne', '_'].includes(p[k]))
        )
  }
  return false
}

/** Ob der umgebende Bereich leere Zeilen zeigt; ausserhalb eines Bereichs immer. */
export const LeereZeigen = createContext(true)

/**
 * Eigenschaften für eine Zeile einer Akte: markiert sie als leer (`data-leer`, zum Zählen) und blendet sie aus,
 * solange ihr `LeereFelderBereich` zu ist. Ohne `leer` entscheidet der angezeigte Wert; Eingabefelder und Auswahlen
 * geben `leer` selbst an.
 */
export function useLeerZeile(wert: ReactNode, leer?: boolean): { 'data-leer'?: ''; hidden?: true } {
  const zeigen = useContext(LeereZeigen)
  if (!(leer ?? istLeer(wert))) return {}
  return zeigen ? { 'data-leer': '' } : { 'data-leer': '', hidden: true }
}
