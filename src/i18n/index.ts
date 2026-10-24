import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Sprache } from '@/types/modul'

/**
 * Übersetzungen DE/FR mit festen Schlüsseln (statt der Laufzeit-Übersetzung der Vorlage).
 * Ein Test prüft, dass beide Sprachen dieselben Schlüssel haben.
 *
 * Die Texte sind je rund 200 KB gross. Damit der Start schneller geht, liegen sie in eigenen Dateien: Vor der
 * ersten Ansicht wird nur die eigene Sprache geladen, die andere gleich danach im Hintergrund (Kundendokumente
 * und Mails in der Sprache des Kunden brauchen beide).
 */
const DATEIEN: Record<Sprache, () => Promise<{ default: Record<string, unknown> }>> = {
  de: () => import('./de.json'),
  fr: () => import('./fr.json'),
}

void i18n.use(initReactI18next).init({
  resources: {},
  partialBundledLanguages: true,
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
})

const laufend = new Map<Sprache, Promise<void>>()

/** Lädt die Texte einer Sprache (einmal); danach übersetzen `t` und `getFixedT` in dieser Sprache. */
export function ladeSprache(sprache: Sprache): Promise<void> {
  if (i18n.hasResourceBundle(sprache, 'translation')) return Promise.resolve()
  let p = laufend.get(sprache)
  if (!p) {
    p = DATEIEN[sprache]().then((m) => {
      i18n.addResourceBundle(sprache, 'translation', m.default, true, true)
    })
    laufend.set(sprache, p)
  }
  return p
}

/** Für den Start: erst die eigene Sprache (die Ansicht wartet darauf), die andere ohne Warten hinterher. */
export async function starteSprachen(eigene: Sprache): Promise<void> {
  await ladeSprache(eigene)
  await i18n.changeLanguage(eigene)
  void ladeSprache(eigene === 'de' ? 'fr' : 'de')
}

export default i18n
