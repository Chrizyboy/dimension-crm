import { defaultFilter } from 'cmdk'

/** Kleinbuchstaben ohne Akzente, damit «Spesen» auch «spésen» und «Benoît» auch «benoit» findet. */
function einfach(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Rangfolge der Befehlspalette (Ctrl K). `stichworte[0]` ist der Titel. Der Titel zählt vor Untertitel und
 * Stichworten, ganze Wörter vor verstreuten Buchstaben. Warum: Die reine Buchstabenfolge von cmdk setzte bei
 * «Fehler melden» die Kennzahlen nach oben, weil deren langer Untertitel alle Buchstaben in Reihenfolge enthält;
 * Enter öffnete dann den falschen Bereich.
 * @param suche Eingabe in der Palette
 * @param stichworte Titel, Untertitel und weitere Stichworte des Eintrags
 * @returns 0 = ausblenden, sonst je höher, desto weiter oben
 */
export function befehlTreffer(suche: string, stichworte: readonly string[] = []): number {
  const q = einfach(suche)
  if (!q) return 1
  const [titel = '', ...rest] = stichworte.map(einfach)
  if (titel === q) return 1
  if (titel.startsWith(q)) return 0.95
  if (titel.split(/[\s·,/-]+/).some((w) => w.startsWith(q))) return 0.9
  if (titel.includes(q)) return 0.85
  const woerter = q.split(/\s+/)
  if (woerter.every((w) => titel.includes(w))) return 0.8
  const alles = [titel, ...rest].join(' ')
  if (woerter.every((w) => alles.includes(w))) return 0.6
  // Tippfehler und Abkürzungen («kndn» → Kunden) nur noch im Titel, und immer hinter echten Wort-Treffern.
  return defaultFilter(titel, q) * 0.5
}
