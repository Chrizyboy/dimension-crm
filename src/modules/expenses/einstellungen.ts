import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0048); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'spesen',
    gruppe: 'ablaeufe',
    titel: { de: 'Spesen-Kategorien', fr: 'Catégories de frais' },
    beschreibung: {
      de: 'Kategorien mit Konto, MWST, Richtwert und ab wann ein Beleg nötig ist.',
      fr: 'Catégories avec compte, TVA, valeur indicative et seuil du justificatif.',
    },
    stichworte: { de: 'Spesen Kilometer Konto Beleg Richtwert', fr: 'frais kilomètres compte justificatif' },
    icon: 'receipt',
    recht: 'admin',
    modulPfad: '/expenses',
    Inhalt: lazy(() => import('./components/Kategorien').then((m) => ({ default: m.Kategorien }))),
  },
]
