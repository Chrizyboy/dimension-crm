import '@testing-library/jest-dom/vitest'
import i18n from '@/i18n'
import de from '@/i18n/de.json'
import fr from '@/i18n/fr.json'

// In der App kommen die Texte nachgeladen (src/i18n/index.ts); in den Tests sofort beide, damit nichts warten muss.
i18n.addResourceBundle('de', 'translation', de, true, true)
i18n.addResourceBundle('fr', 'translation', fr, true, true)
