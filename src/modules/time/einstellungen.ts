import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0048); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'zeiterfassung',
    gruppe: 'ablaeufe',
    titel: { de: 'Zeiterfassung', fr: 'Saisie du temps' },
    beschreibung: {
      de: 'Wer alle sieht und bewilligt, Wochenstunden, Ferientage, Start und Feiertage je Standort.',
      fr: 'Qui voit tout et valide, heures hebdomadaires, vacances, début et jours fériés par site.',
    },
    stichworte: {
      de: 'Ferien Feiertage Arbeitszeit Stunden Bewilligung',
      fr: 'vacances fériés horaire heures validation',
    },
    icon: 'clock',
    recht: 'admin',
    modulPfad: '/time',
    Inhalt: lazy(() => import('./components/ZeitEinstellungen').then((m) => ({ default: m.ZeitEinstellungen }))),
  },
]
