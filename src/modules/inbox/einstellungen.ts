import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0048); die Route `src/app/settings.tsx` sammelt sie. */
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
  {
    // Seit 27.11.2026 hier statt als Reiter im Posteingang (Chris: Posteingang nur Arbeitsplatz).
    id: 'posteingang_regeln',
    gruppe: 'ablaeufe',
    titel: { de: 'Absender-Regeln', fr: 'Règles d’expéditeur' },
    beschreibung: {
      de: 'Mails bestimmter Absender automatisch einordnen, zuteilen oder als Werbung ablegen.',
      fr: 'Classer, attribuer ou ranger comme publicité les e-mails de certains expéditeurs.',
    },
    stichworte: {
      de: 'Absender Regel Werbung Newsletter automatisch Posteingang',
      fr: 'expéditeur règle publicité newsletter automatique boîte',
    },
    icon: 'filter',
    recht: 'admin',
    modulPfad: '/inbox',
    Inhalt: lazy(() => import('./components/AbsenderRegeln').then((m) => ({ default: m.AbsenderRegeln }))),
  },
]
