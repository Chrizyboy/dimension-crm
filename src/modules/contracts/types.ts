/** Fachliche Typen des Moduls «Wartungsverträge» (Phase 9, V233 «Verträge», Pakete der Website 02.11.2026). */

/** Filter der Liste. */
export const FILTER = ['aktiv', 'faellig', 'rechnung', 'kuendbar', 'gekuendigt', 'alle'] as const
export type Filter = (typeof FILTER)[number]

export const STATUS = ['aktiv', 'gekuendigt', 'beendet'] as const

/** Text in beiden Sprachen. */
export interface Zweisprachig {
  de: string
  fr: string
}

/** Eine Leistung (im Vertrag beim Abschluss kopiert). */
export interface Leistung extends Zweisprachig {
  standard?: boolean
}

/** Ein Paket der Website (Einstellung «wartung_pakete»). */
export interface Paket {
  id: string
  name: string
  empfohlen?: boolean
  art: Zweisprachig
  satz: Zweisprachig
  /** Inspektion vor Ort alle n Monate, null = keine (Essentiel). */
  inspektion_monate: number | null
  messung: boolean
  rabatt_prozent: number
  kleinreparatur_rappen: number
  /** Preise exkl. MWST je Stufe (bis 20, 20–50, 50–100 kWp). */
  preise_rappen: number[]
  leistungen: Leistung[]
}

/** Zusatzleistung (Bestandsaufnahme, Anlagecheck …), Preis null = auf Offerte. */
export interface Zusatz extends Zweisprachig {
  id: string
  rappen: number | null
}

/** Vertragsbedingungen der Website als Zahlen. */
export interface Bedingungen {
  mindestlaufzeit_jahre: number
  verlaengerung_jahre: number
  kuendigung_monate: number
  zahlungsfrist_tage: number
  rechnung_vorlauf_tage: number
  ankuendigung_tage: number
  bestandsaufnahme_ab_jahren: number
}

/** Ganzer Katalog «Wartungsverträge 2026». */
export interface Katalog {
  stand: string
  stufen_kwp: number[]
  pakete: Paket[]
  zusatz: Zusatz[]
  bedingungen: Bedingungen
  texte: Record<'de' | 'fr', { titel: string; text: string }[]>
}

/** Eintrag im Verlauf: eine durchgeführte Wartung oder ein Vermerk. */
export interface Wartung {
  am: string
  person_id: string | null
  notiz: string | null
}

export type Bestandsaufnahme = 'keine' | 'verrechnen' | 'verrechnet' | 'erlassen'

/** Ein Wartungsvertrag (W001 …). */
export interface Vertrag {
  id: string
  nummer: string | null
  status: string
  kontakt_id: string
  projekt_id: string | null
  anlage_id: string | null
  paket: string | null
  anlage_kwp: number | null
  speicher_kwh: number | null
  ibn_jahr: number | null
  wechselrichter: string | null
  anlage_ort: string | null
  fremdanlage: boolean
  start_am: string | null
  laufzeit_jahre: number
  rhythmus_monate: number | null
  /** Jahrespreis inkl. MWST (aus dem Preis exkl. gerechnet). */
  preis_rappen: number | null
  /** Jahrespreis exkl. MWST. */
  preis_netto_rappen: number | null
  /** Tarif der Website beim Abschluss, exkl. MWST. */
  tarif_netto_rappen: number | null
  bestandsaufnahme: Bestandsaufnahme
  leistungen: Leistung[]
  letzte_wartung: string | null
  naechste_wartung: string | null
  gekuendigt_am: string | null
  gekuendigt_per: string | null
  verrechnet_bis: string | null
  /** Geplante Inspektion (Beginn, Ende, wer). */
  termin_von: string | null
  termin_bis: string | null
  termin_person_id: string | null
  /** Ankündigung an den Kunden im Ausgangskorb angelegt. */
  angekuendigt_am: string | null
  sprache: 'de' | 'fr'
  notiz: string | null
  verlauf: Wartung[]
  kunde: string
  telefon: string | null
  adresse: string[]
  ort: string | null
  projekt: string | null
}

/** Felder zum Anlegen oder Ändern. */
export type VertragEingabe = Pick<
  Vertrag,
  | 'status'
  | 'kontakt_id'
  | 'projekt_id'
  | 'anlage_id'
  | 'paket'
  | 'anlage_kwp'
  | 'speicher_kwh'
  | 'ibn_jahr'
  | 'wechselrichter'
  | 'anlage_ort'
  | 'fremdanlage'
  | 'start_am'
  | 'laufzeit_jahre'
  | 'preis_netto_rappen'
  | 'bestandsaufnahme'
  | 'leistungen'
  | 'sprache'
  | 'notiz'
>

/** Anlage eines Kunden zum Vorfüllen. */
export interface KundenAnlage {
  id: string
  projekt_id: string | null
  projekt: string | null
  kwp: number | null
  ibn_jahr: number | null
  wechselrichter: string | null
  ort: string
}

/** Rechnung zu einem Vertrag. */
export interface VertragRechnung {
  id: string
  nummer: string | null
  status: string
  datum: string | null
  total_rappen: number | null
  titel: string | null
}

/** Prüfpunkt der Inspektion (Einstellung «wartung_pakete.pruefpunkte»). */
export interface WartungPruefpunkt {
  schluessel: string
  de: string
  fr: string
  art: 'ja_nein' | 'wert'
  einheit?: string
  /** Nur bei Paketen mit Messung (Premium). */
  nur_messung?: boolean
}

/** Reiter der Wartung. */
export const WARTUNG_REITER = ['vertraege', 'inspektionen', 'ohne'] as const
export type WartungReiter = (typeof WARTUNG_REITER)[number]

/** Eigene Anlage ohne laufenden Wartungsvertrag (Sicht «wartung_ohne_vertrag»). */
export interface OhneVertrag {
  anlage_id: string
  kontakt_id: string
  kunde: string
  email: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  ort: string | null
  plz: string | null
  leistung_kwp: number | null
  ibn_am: string
  garantie_bis: string | null
  projekt_nummer: string | null
  paket: string
  tarif_rappen: number | null
  angebot_am: string | null
  angebot_stand: 'offen' | 'angenommen' | 'abgelehnt' | null
}

/** Person für die Planung. */
export interface PlanPerson {
  id: string
  name: string
}
