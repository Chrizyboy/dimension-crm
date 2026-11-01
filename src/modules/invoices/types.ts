/** Fachliche Typen des Moduls «Rechnungen». Beträge immer in Rappen (Ganzzahl). */
import type { RechnungArt } from '@/types/rechnung'

export { RECHNUNG_ARTEN, RECHNUNG_STATUS } from '@/types/rechnung'
export type {
  Empfaenger,
  Firma,
  Position,
  Rechnung,
  RechnungArt,
  RechnungStatus,
  RechnungVoll,
  Zahlung,
} from '@/types/rechnung'
/** Filter der Liste (V233: geplant/gestellt/überfällig/bezahlt). */
export const RECHNUNG_FILTER = ['offen', 'ueberfaellig', 'entwuerfe', 'bezahlt', 'alle'] as const
export type RechnungFilter = (typeof RECHNUNG_FILTER)[number]

/** Reiter der Seite. */
export const REITER = ['rechnungen', 'verrechnen', 'firmen'] as const
export type Reiter = (typeof REITER)[number]

/** Tranche aus dem Zahlungsplan ohne Rechnung (Sicht offene_tranchen). */
export interface Tranche {
  id: string
  projekt_id: string
  projekt_nummer: string
  projekt_titel: string | null
  kontakt_id: string | null
  kunde: string | null
  bezeichnung: string
  betrag_rappen: number
  faellig_am: string | null
  bau_status: string | null
}

/** Kostenpflichtiger Rapport ohne Rechnung (Sicht offene_service_rapporte). */
export interface OffenerRapport {
  id: string
  nummer: string
  art: string
  datum: string
  kontakt_id: string | null
  kunde: string | null
  service_nummer: string | null
  service_titel: string | null
  projekt_nummer: string | null
}

/** Was «Neue Rechnung» an die Datenbank schickt (rechnung_entwurf). */
export interface EntwurfVorgabe {
  zahlungsplan_id?: string
  rapport_id?: string
  wartungsvertrag_id?: string
  projekt_id?: string
  kontakt_id?: string
  art?: RechnungArt
  prozent?: number
  titel?: string
}
