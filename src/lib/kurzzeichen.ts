/**
 * Kurzzeichen einer Person («CR», «LP»): gleiche Regel wie `intern.kurzzeichen_vorschlag` in der Datenbank,
 * damit das Formular schon vor dem Speichern zeigt, was die Datenbank bei leerem Feld setzt.
 * Massgebend bleibt die Datenbank; sie kennt auch Gelöschte und Personen, die die App nicht lädt.
 */

/** Teilt einen Namen in Wörter (Leerzeichen und Bindestrich), ohne Punkt, Komma, Apostroph und Klammern. */
function woerter(name: string): string[] {
  return name
    .replace(/[.,'’()]/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.toUpperCase())
}

/**
 * Schlägt ein freies Kurzzeichen vor: Vorname + Nachname je ein Buchstabe, bei Besetzung mehr Buchstaben,
 * zuletzt eine Ziffer. Ein Wort allein gibt die ersten zwei Buchstaben («Loris» → «LO»).
 * @param name Vor- und Nachname
 * @param vergeben schon vergebene Kurzzeichen (ohne die Person selbst)
 */
export function kurzzeichenVorschlag(name: string, vergeben: readonly string[] = []): string {
  const teile = woerter(name)
  const vor = teile[0] ?? ''
  if (!vor) return ''
  const nach = teile.length > 1 ? (teile[teile.length - 1] ?? '') : ''
  const belegt = new Set(vergeben.map((v) => v.toUpperCase()))
  const kandidaten = nach
    ? [
        vor.slice(0, 1) + nach.slice(0, 1),
        vor.slice(0, 1) + nach.slice(0, 2),
        vor.slice(0, 2) + nach.slice(0, 1),
        vor.slice(0, 1) + nach.slice(0, 3),
      ]
    : [vor.slice(0, 2), vor.slice(0, 3), vor.slice(0, 4)]
  const frei = kandidaten.find((k) => !belegt.has(k))
  if (frei) return frei
  const basis = kandidaten[0] ?? vor
  for (let i = 2; i < 100; i++) {
    const k = basis.slice(0, 4 - String(i).length) + String(i)
    if (!belegt.has(k)) return k
  }
  return ''
}

/** Bereinigt eine Eingabe: ohne Leerzeichen, gross, höchstens vier Zeichen (wie die Datenbank prüft). */
export function kurzzeichenBereinigt(eingabe: string): string {
  return eingabe.replace(/\s/g, '').toUpperCase().slice(0, 4)
}

/** Das Nötige einer Person für die Anzeige: Name und (falls gesetzt) Kurzzeichen aus `personen.kurzzeichen`. */
export interface KurzzeichenPerson {
  name: string
  kurzzeichen?: string | null
}

/** Kurzzeichen einer Person, Rückfall auf die Initialen («Chris Rosenberg» → «CR»), solange keines gesetzt ist. */
export function kurzzeichenVon(person: KurzzeichenPerson): string {
  if (person.kurzzeichen) return person.kurzzeichen
  const teile = woerter(person.name)
  const vor = teile[0]?.[0] ?? ''
  const nach = teile.length > 1 ? (teile[teile.length - 1]?.[0] ?? '') : ''
  return vor + nach
}
