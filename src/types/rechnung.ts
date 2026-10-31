/**
 * Rechnung, wie sie Rechnungen und Werkverträge brauchen (PDF, Mail). Beträge immer in Rappen (Ganzzahl).
 * Gemeinsam, weil Module sich nicht gegenseitig importieren (Regel 2).
 */

export const RECHNUNG_ARTEN = ['anzahlung', 'teilzahlung', 'schluss', 'service', 'wartung', 'frei'] as const
export type RechnungArt = (typeof RECHNUNG_ARTEN)[number]

export const RECHNUNG_STATUS = ['entwurf', 'gestellt', 'teilbezahlt', 'bezahlt', 'storniert'] as const
export type RechnungStatus = (typeof RECHNUNG_STATUS)[number]

/** Eine Zeile der Rechnung; Abzüge (frühere Rechnungen) sind negativ. */
export interface Position {
  text: string
  menge: number
  einheit?: string
  preis_rappen: number
  bezug?: 'tranche' | 'nachtrag' | 'rechnung' | 'zeit' | 'material' | 'wartung'
  bezug_id?: string | null
}

/** Zeile der Liste (Sicht rechnungen_liste). */
export interface Rechnung {
  id: string
  nummer: string | null
  art: RechnungArt
  status: RechnungStatus
  titel: string
  datum: string | null
  faellig_am: string | null
  sprache: 'de' | 'fr'
  inkl_mwst: boolean
  netto_rappen: number
  mwst_rappen: number
  total_rappen: number
  bezahlt_rappen: number
  offen_rappen: number
  bezahlt_am: string | null
  mahnstufe: number
  gemahnt_am: string | null
  mahnfrist: string | null
  abaninja_uuid: string | null
  abaninja_status: string | null
  abaninja_abgeglichen_am: string | null
  ueberfaellig: boolean
  kontakt_id: string
  kunde: string
  kundennummer: number | null
  projekt_id: string | null
  projekt_nummer: string | null
  zahlungsplan_id: string | null
  rapport_id: string | null
  wartungsvertrag_id: string | null
  firma_id: string
  firma: string
  erstellt_am: string
}

/** Rechnende Firma (Standort) mit den Angaben für Rechnung und QR-Zahlteil. */
export interface Firma {
  id: string
  kuerzel: string
  name: string
  strasse: string | null
  plz: string | null
  ort: string | null
  sprache: string | null
  mwst_nr: string | null
  uid_nr: string | null
  iban: string | null
  bank: string | null
  telefon: string | null
  email: string | null
  zahlungsfrist_tage: number
}

/** Empfänger mit Adresse (aus dem neuesten Objekt des Kunden). */
export interface Empfaenger {
  name: string
  anrede: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  email: string | null
}

/** Zahlung auf eine Rechnung. */
export interface Zahlung {
  id: string
  datum: string
  betrag_rappen: number
  quelle: 'hand' | 'abaninja'
  notiz: string | null
}

/** Rechnung mit allem für Akte und PDF. */
export interface RechnungVoll extends Rechnung {
  positionen: Position[]
  mwst_satz: number
  notiz: string | null
  storniert_grund: string | null
  firma_daten: Firma
  empfaenger: Empfaenger
  zahlungen: Zahlung[]
}
