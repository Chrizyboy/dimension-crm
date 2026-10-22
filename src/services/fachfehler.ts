import i18n from '@/i18n'

/**
 * Die Datenbank meldet fachliche Fehler als Code (z. B. «offerte.text_fehlt», «stand.grund_fehlt»),
 * damit die Oberfläche sie in der Sprache der Person zeigen kann. Gemeinsam für alle Module.
 * Liefert den i18n-Schlüssel oder null, wenn es ein technischer Fehler ist.
 */
export function fachFehlerSchluessel(fehler: unknown): string | null {
  const text = typeof fehler === 'object' && fehler && 'message' in fehler ? String(fehler.message) : ''
  if (!/^[a-z]+\.[a-z_]+$/.test(text)) return null
  const schluessel = `fachfehler.${text.replace('.', '_')}`
  return i18n.exists(schluessel) ? schluessel : null
}

/** Text in beiden Sprachen zu einem i18n-Schlüssel, für `melde()`. */
export function zweisprachig(schluessel: string, werte: Record<string, unknown> = {}): { de: string; fr: string } {
  return { de: i18n.getFixedT('de')(schluessel, werte), fr: i18n.getFixedT('fr')(schluessel, werte) }
}
