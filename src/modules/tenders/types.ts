/** Fachliche Typen des Moduls «Ausschreibungen» (Ausschreibungs-Monitor, Phase 8b). */

/** Die drei Spuren: selbst offerieren, die richtige Firma anschreiben, oder abwarten. */
export type Spur = 'angebot' | 'akquise' | 'beobachten'

/** Woher eine Meldung stammt: simap, Amtsblattportal oder von Hand erfasst. */
export type Art = 'ausschreibung' | 'elektro_gesamtlos' | 'zuschlag' | 'planermandat' | 'vorankuendigung' | 'baugesuch'

/** Stand eines Dossiers (je Spur andere Schritte, dazu «später», «verworfen», «archiviert»). */
export type DossierStatus =
  | 'pruefen'
  | 'teilnahme'
  | 'kalkulation'
  | 'eingereicht'
  | 'zuschlag'
  | 'absage'
  | 'nicht_teilnehmen'
  | 'kontakt_fehlt'
  | 'entwurf'
  | 'bewilligt'
  | 'versendet'
  | 'nachfassen'
  | 'antwort'
  | 'lead'
  | 'kein_interesse'
  | 'beobachten'
  | 'spaeter'
  | 'verworfen'
  | 'archiviert'

/** Ein Dossier: eine Ausschreibung oder ein Baugesuch mit allen Meldungen dazu. */
export interface Dossier {
  id: string
  nummer: string
  quelle: string
  quell_url: string | null
  art: Art
  spur: Spur
  status: DossierStatus
  prioritaet: 'A' | 'B' | 'C' | null
  punkte: number
  begruendung: string | null
  titel: string
  beschreibung: string | null
  gemeinde: string | null
  plz: string | null
  kanton: string | null
  sprache: 'de' | 'fr'
  standort: string | null
  fahrzeit_min: number | null
  vergabestelle: string | null
  frist: string | null
  frist_fragen: string | null
  frist_begehung: string | null
  frist_eingabe: string | null
  publiziert_am: string | null
  parzelle: string | null
  bauherr: string | null
  bauherr_art: string | null
  ausloeser: string | null
  ausloeser_am: string | null
  grund: string | null
  haupt_id: string | null
  korrigiert_am: string | null
  wiedervorlage_am: string | null
  eingereicht_am: string | null
  eingereicht_form: string | null
  offerte_id: string | null
  verkaufschance_id: string | null
  erstellt_am: string
}

/** Rolle eines Kontakts im Dossier. */
export type KontaktRolle = 'bauherr' | 'architekt' | 'gu' | 'planer' | 'gemeinde' | 'gewinner' | 'vergabestelle'

/** Wer zum Dossier gehört. «privat» heisst: nur Brief oder Anruf. */
export interface DossierKontakt {
  id: string
  ausschreibung_id: string
  rolle: KontaktRolle
  art: 'privat' | 'firma' | 'gemeinde' | 'behoerde'
  name: string
  firma: string | null
  email: string | null
  telefon: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  sprache: 'de' | 'fr'
  quelle_link: string
  notiz: string | null
  kontakt_id: string | null
}

/** Ein Anschreiben (Mail, Brief oder Anruf), erst oder nachfassen. */
export interface Anschreiben {
  id: string
  ausschreibung_id: string
  dossier_kontakt_id: string
  kanal: 'mail' | 'brief' | 'anruf'
  art: 'erst' | 'nachfassen'
  sprache: 'de' | 'fr'
  an: string | null
  betreff: string
  text: string
  status: 'entwurf' | 'bewilligt' | 'versendet' | 'abgelehnt'
  abgelehnt_grund: string | null
  bewilligt_am: string | null
  versendet_am: string | null
  antwort_am: string | null
  antwort_art: 'interesse' | 'kein_interesse' | 'keine_werbung' | null
  verkaufschance_id: string | null
  erstellt_am: string
  /** Aus dem Dossier, für die Liste. */
  dossier: { nummer: string; titel: string; gemeinde: string | null; prioritaet: string | null; frist: string | null }
  empfaenger: string
  bewilligt_durch: string | null
}

/** Eintrag der Sperrliste. */
export interface Sperre {
  id: string
  art: 'email' | 'domain' | 'name'
  wert: string
  grund: string
  bis: string | null
  aufgehoben_am: string | null
  erstellt_am: string
  ausschreibung_id: string | null
}

/** Ein Lauf einer Quelle (Quellen-Kontrolle). */
export interface QuellenLauf {
  id: string
  quelle: string
  beginn: string
  ende: string | null
  ok: boolean | null
  gelesen: number
  neu: number
  aktualisiert: number
  meldung: string | null
}

/** Zahlen für Startseite und Reiter. */
export interface Tagesbericht {
  neu_heute: number
  pruefen: number
  bewilligen: number
  senden: number
  antworten: number
  kontakt_fehlt: number
  fristen: number
  quellen_still: number
  darf_bewilligen: boolean
  darf_senden: boolean
}

/** Eine Zeile des Trichters. */
export interface TrichterZeile {
  quelle: string
  kanton: string
  gefunden: number
  relevant: number
  bearbeitet: number
  antwort: number
  erfolg: number
}

/** Reiter der Seite: Andy prüft und bewilligt, Chris sendet, alle sehen Liste, Quellen und Trichter. */
export const REITER = ['pruefen', 'bewilligen', 'senden', 'alle', 'quellen', 'trichter'] as const
export type Reiter = (typeof REITER)[number]

/** Filter der Liste «Alle». */
export const LISTEN_FILTER = ['offen', 'angebot', 'akquise', 'beobachten', 'erledigt'] as const
export type ListenFilter = (typeof LISTEN_FILTER)[number]

/** Einstellungen des Monitors, soweit die Oberfläche sie zeigt oder ändert. */
export interface MonitorRegeln {
  bewilligen: string[]
  bewilligen_vertretung: string[]
  senden: string[]
  senden_vertretung: string[]
  innendienst: string[]
  fahrzeit_max: number
  nachfassen_arbeitstage: number
  beobachten_monate: number
  privat_briefe: boolean
  kantone: string[]
  simap_zeiten: string[]
  amtsblatt_rubriken: string[]
}
