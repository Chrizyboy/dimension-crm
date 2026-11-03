import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0047); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'assistent',
    gruppe: 'system',
    titel: { de: 'Assistent (KI)', fr: 'Assistant (IA)' },
    beschreibung: {
      de: 'Modelle, Tageslimit, Firmenstil und welche KI-Funktionen eingeschaltet sind.',
      fr: 'Modèles, limite journalière, style maison et fonctions IA activées.',
    },
    stichworte: { de: 'KI Claude Modell Budget Limit Kosten Stil', fr: 'IA Claude modèle budget limite coûts style' },
    icon: 'sparkles',
    recht: 'admin',
    modulPfad: '/ai',
    Inhalt: lazy(() => import('./components/Einstellungen').then((m) => ({ default: m.Einstellungen }))),
  },
]
