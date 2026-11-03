/** Felder, die bei jeder Änderung mitlaufen und darum im Protokoll nichts aussagen. */
const TECHNISCH = new Set([
  'id',
  'erstellt_am',
  'erstellt_von',
  'geaendert_am',
  'alt_daten',
  'alt_id',
  'suchtext',
  'fts',
])

export interface Feldaenderung {
  feld: string
  vorher: string
  nachher: string
}

/** Kurzer, lesbarer Wert für die Anzeige (Listen und Objekte als JSON, gekürzt). */
export function wertText(w: unknown): string {
  if (w === null || w === undefined || w === '') return '–'
  const text =
    typeof w === 'string' ? w : typeof w === 'number' || typeof w === 'boolean' ? String(w) : JSON.stringify(w)
  return text.length > 80 ? `${text.slice(0, 79)}…` : text
}

/**
 * Welche Felder sich zwischen vorher und nachher unterscheiden, ohne technische Felder.
 * Beim Anlegen (vorher leer) erscheinen die gefüllten Felder, beim Löschen die alten.
 */
export function geaenderteFelder(vorher: unknown, nachher: unknown): Feldaenderung[] {
  const a = vorher && typeof vorher === 'object' ? (vorher as Record<string, unknown>) : {}
  const b = nachher && typeof nachher === 'object' ? (nachher as Record<string, unknown>) : {}
  const felder = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((f) => !TECHNISCH.has(f))
  return felder
    .filter((f) => JSON.stringify(a[f] ?? null) !== JSON.stringify(b[f] ?? null))
    .map((f) => ({ feld: f, vorher: wertText(a[f]), nachher: wertText(b[f]) }))
}

/** Bezeichnung des Datensatzes aus den üblichen Feldern (wie im Papierkorb der Datenbank). */
export function datensatzText(d: unknown): string {
  if (!d || typeof d !== 'object') return ''
  const x = d as Record<string, unknown>
  const s = (k: string) => (typeof x[k] === 'string' || typeof x[k] === 'number' ? String(x[k]) : '')
  const name =
    s('name') ||
    s('titel') ||
    s('betreff') ||
    s('bezeichnung') ||
    s('text_de') ||
    [s('vorname'), s('nachname')].filter(Boolean).join(' ') ||
    s('firma') ||
    s('schluessel')
  return [s('nummer'), name].filter(Boolean).join(' · ')
}
