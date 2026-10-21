import i18n from 'i18next'

/**
 * Die Datenbank meldet fachliche Fehler als Schlüssel (z. B. «stand.grund_fehlt»), damit die Oberfläche
 * sie in der Sprache der Person zeigen kann. Liefert den i18n-Schlüssel oder null für technische Fehler.
 */
export function fachFehler(fehler: unknown): string | null {
  const text = typeof fehler === 'object' && fehler && 'message' in fehler ? String(fehler.message) : ''
  return /^(stand|lead)\.[a-z_]+$/.test(text) ? `verkauf.fehler.${text.replace('.', '_')}` : null
}

/** Ein Text in beiden Sprachen für `melde()`, das Meldungen zweisprachig ablegt. */
export function beideSprachen(schluessel: string): { de: string; fr: string } {
  return { de: i18n.getFixedT('de')(schluessel), fr: i18n.getFixedT('fr')(schluessel) }
}
