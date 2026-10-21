import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './de.json'
import fr from './fr.json'

/**
 * Übersetzungen DE/FR mit festen Schlüsseln (statt der Laufzeit-Übersetzung der Vorlage).
 * Ein Test prüft, dass beide Sprachen dieselben Schlüssel haben.
 */
void i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, fr: { translation: fr } },
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
})

export default i18n
