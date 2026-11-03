import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/** Bereiche dieses Moduls in Einstellungen (zentral, Entscheid 0047); die Route `src/app/settings.tsx` sammelt sie. */
export const einstellungen: EinstellungsBereich[] = [
  {
    id: 'firmen',
    gruppe: 'firma',
    titel: { de: 'Firmen & Bank', fr: 'Sociétés et banque' },
    beschreibung: {
      de: 'Muri GmbH und Bulle Sàrl: Adresse, MWST-Nummer, IBAN und Zahlungsfrist auf Rechnungen.',
      fr: 'Muri GmbH et Bulle Sàrl : adresse, n° TVA, IBAN et délai de paiement sur les factures.',
    },
    stichworte: {
      de: 'IBAN Bank QR Rechnung MWST UID Zahlungsfrist Firma',
      fr: 'IBAN banque QR facture TVA IDE délai société',
    },
    icon: 'building-2',
    recht: 'admin',
    modulPfad: '/invoices',
    Inhalt: lazy(() => import('./components/Firmen').then((m) => ({ default: m.Firmen }))),
  },
]
