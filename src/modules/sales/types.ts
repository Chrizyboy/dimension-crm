/** Fachliche Typen des Moduls «Anfragen & Leads». */

/** Die Ansichten des Bereichs (V233: Leads · Tagesroute · Tour planen · Kalender · Regionen · Monatsbericht). */
export type VerkaufAnsicht = 'pipeline' | 'liste' | 'tagesroute' | 'tour' | 'kalender' | 'regionen' | 'bericht'

export const VERKAUF_ANSICHTEN: readonly VerkaufAnsicht[] = [
  'pipeline',
  'liste',
  'tagesroute',
  'tour',
  'kalender',
  'regionen',
  'bericht',
]

/**
 * Ein Geschäft der Pipeline: ein Lead mit seiner jüngsten Offerte und seinem Projekt,
 * oder eine Offerte/ein Projekt ohne Lead aus V233 (Ansicht `verkauf_geschaefte`).
 */
export interface Geschaeft {
  id: string
  art: 'verkaufschancen' | 'offerten' | 'projekte'
  verkaufschanceId: string | null
  offerteId: string | null
  projektId: string | null
  /** L001 …, sonst Offert- oder Projektnummer. */
  nummer: string
  offerteNummer: string | null
  kontaktId: string
  kundennummer: number
  name: string
  telefon: string | null
  email: string | null
  sprache: 'de' | 'fr'
  werbesperre: boolean
  objektId: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  /** Lage für Karte und Route: genau, falls erfasst, sonst Mitte der PLZ. */
  breite: number | null
  laenge: number | null
  lageGenau: boolean
  hoehe: number | null
  standort: 'muri' | 'bulle' | null
  regionId: string | null
  personId: string | null
  /** «Termin bei» (Aussendienst). */
  terminPersonId: string | null
  stufe: string | null
  offerteStatus: string | null
  quelle: string | null
  eingangAm: string | null
  terminAm: string | null
  terminDauerMin: number | null
  wiedervorlageAm: string | null
  wiedervorlageGrund: string | null
  verlustgrund: string | null
  erreichbarkeit: string | null
  interesse: string[]
  kommentarKunde: string | null
  angebotAm: string | null
  nachfassenAm: string | null
  vertagtGrund: string | null
  /** Offert- oder Vertragswert in Rappen. */
  wertRappen: number | null
  kwp: number | null
  /** Schlüssel aus «kundenstand» (16 Stände) und seine Gruppe (6). */
  stand: string
  standRang: number
  gruppe: string
  standDatum: string | null
  letzterKontakt: string | null
  geaendertAm: string | null
  suchtext: string
  telefonZiffern: string
}

/** Angaben, die ein Wechsel des Stands braucht (Grund, Datum, Termin). */
export interface StandAngaben {
  datum?: string
  grund?: string
  notiz?: string
  termin_am?: string
  dauer_min?: number
  person_id?: string
  richtofferte?: boolean
}

/** Was ein Stand beim Wechsel abfragt (V170). */
export type StandBedarf = 'nichts' | 'grund' | 'datumGrund' | 'termin' | 'gesendet' | 'richtofferte'

/** Filter über Pipeline und Liste, auch Teil einer gespeicherten Ansicht. */
export interface VerkaufFilter {
  suche: string
  standorte: string[]
  personen: string[]
  quellen: string[]
  regionen: string[]
}

export const LEERER_FILTER: VerkaufFilter = { suche: '', standorte: [], personen: [], quellen: [], regionen: [] }

/** Eine Person mit Kundenterminen (Aussendienst). */
export interface Aussendienst {
  id: string
  kuerzel: string
  name: string
  vorname: string
  standort: 'muri' | 'bulle' | null
  /** Heimadresse aus «Mein Konto» als Start der Route. */
  heim: { strasse: string; plz: string; ort: string } | null
}

/** Ein Ort mit Lage, z. B. Standort, Zuhause oder ein Lead. */
export interface Punkt {
  breite: number
  laenge: number
}
