/** Reine Regeln des Mehrfach-Filters (ohne Oberfläche, damit sie sich einfach prüfen lassen). */

interface Option {
  wert: string
  text: string
}

/**
 * Ein Häkchen setzen oder wegnehmen. Leer heisst «alle»: wer bei «alle» eines wegnimmt, sieht danach
 * alle ausser diesem. Sind wieder alle angehakt, wird daraus «alle» (leer), damit später neue Werte
 * (neue Person, neue Quelle) von selbst dabei sind. Das letzte Häkchen bleibt, sonst wäre die Liste leer.
 */
export function schalteWert(alleWerte: readonly string[], gewaehlt: readonly string[], wert: string): string[] {
  const jetzt = gewaehlt.length === 0 ? alleWerte : gewaehlt
  const neu = jetzt.includes(wert) ? jetzt.filter((w) => w !== wert) : [...jetzt, wert]
  if (neu.length === 0) return [...gewaehlt]
  if (alleWerte.every((w) => neu.includes(w))) return []
  return alleWerte.filter((w) => neu.includes(w)).concat(neu.filter((w) => !alleWerte.includes(w)))
}

/**
 * Was auf dem Knopf steht: «Alle Personen», «Filipe», «Filipe, Loris», «Alle ausser Davis» oder «Filipe +3».
 * `ausser` baut den Text «Alle ausser …» in der aktuellen Sprache.
 */
export function beschriftungMehrfach(
  optionen: readonly Option[],
  gewaehlt: readonly string[],
  alleText: string,
  ausser: (text: string) => string,
): string {
  if (gewaehlt.length === 0) return alleText
  const text = (w: string) => optionen.find((o) => o.wert === w)?.text ?? w
  const [erster, zweiter] = gewaehlt.map(text)
  if (gewaehlt.length === 1) return erster ?? alleText
  const fehlen = optionen.filter((o) => !gewaehlt.includes(o.wert))
  if (optionen.length >= 4 && fehlen.length === 1 && fehlen[0]) return ausser(fehlen[0].text)
  if (gewaehlt.length === 2) return `${erster ?? ''}, ${zweiter ?? ''}`
  return `${erster ?? ''} +${String(gewaehlt.length - 1)}`
}
