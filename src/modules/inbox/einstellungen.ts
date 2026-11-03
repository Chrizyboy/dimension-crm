import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0047); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'posteingang',
    gruppe: 'ablaeufe',
    titel: { de: 'Posteingang', fr: 'Boîte de réception' },
    beschreibung: {
      de: 'Postfächer, Verteilung, Reaktionsfrist und Erinnerungen für Mails aus Outlook.',
      fr: 'Boîtes, répartition, délai de réponse et rappels pour les mails d’Outlook.',
    },
    stichworte: {
      de: 'Mail Outlook Postfach Team Frist verteilen Erinnern',
      fr: 'mail Outlook boîte équipe délai répartir rappel',
    },
    icon: 'inbox',
    recht: 'admin',
    modulPfad: '/inbox',
    Inhalt: lazy(() => import('./components/Einstellungen').then((m) => ({ default: m.Einstellungen }))),
  },
]
