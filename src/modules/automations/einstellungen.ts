import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0048); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'automationen',
    gruppe: 'ablaeufe',
    titel: { de: 'Automationen', fr: 'Automatisations' },
    beschreibung: {
      de: 'Versandfenster, Kontakt-Pause und Grundregeln für alle Automationen.',
      fr: 'Fenêtre d’envoi, pause de contact et règles de base de toutes les automatisations.',
    },
    stichworte: {
      de: 'Versandfenster Pause Freigabe automatisch Regeln',
      fr: 'fenêtre envoi pause validation automatique règles',
    },
    icon: 'workflow',
    recht: 'admin',
    modulPfad: '/automations',
    Inhalt: lazy(() => import('./components/Einstellungen').then((m) => ({ default: m.Einstellungen }))),
  },
]
