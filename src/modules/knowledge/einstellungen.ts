import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0047); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'helpdesk',
    gruppe: 'system',
    titel: { de: 'Helpdesk', fr: 'Helpdesk' },
    beschreibung: {
      de: 'Wer über gemeldete Fehler entscheidet und wie Claude sie prüft.',
      fr: 'Qui décide des erreurs signalées et comment Claude les examine.',
    },
    stichworte: { de: 'Fehler melden Rückmeldung Meldungen Claude', fr: 'signaler erreur retour Claude' },
    icon: 'life-buoy',
    recht: 'admin',
    modulPfad: '/knowledge',
    Inhalt: lazy(() => import('./components/HelpdeskEinstellung').then((m) => ({ default: m.HelpdeskEinstellung }))),
  },
]
