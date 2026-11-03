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
  // Submission (Entscheid 0045)
  verantwortlich_id: string | null
  verantwortlich: string | null
  verfahren: 'offen' | 'selektiv' | 'einladung' | 'freihaendig' | null
  auftragsart: 'bau' | 'liefer' | 'dienst' | null
  leistung_kwp: number | null
  schaetzung_rappen: number | null
  ausfuehrung_von: string | null
  ausfuehrung_bis: string | null
  kriterien: Kriterium[]
  varianten: boolean | null
  arge: boolean | null
  eignung_ref_kwp: number | null
  frist_oeffnung: string | null
  zuschlag_erwartet: string | null
  bindefrist_monate: number | null
  eingabe_adresse: string | null
  gng_vorschlag: GngVorschlag | null
  gng_entscheid: 'go' | 'nogo' | null
  gng_grund: string | null
  gng_am: string | null
  checkliste: Record<string, { am: string; von: string | null }>
  pruefung_von: string | null
  pruefung_am: string | null
  angebot_rappen: number | null
  rang: number | null
  anbieter_anzahl: number | null
  zuschlag_rappen: number | null
  gewinner: string | null
  entscheid_datum: string | null
  beschwerde_bis: string | null
  debriefing_am: string | null
  ohne_protokoll: string | null
  projekt_id: string | null
}

/** Zuschlagskriterium mit Gewicht in Prozent. */
export interface Kriterium {
  name: string
  gewicht: number
}

/** Ein Teil des Go/No-Go-Vorschlags. */
export interface GngTeil {
  teil: 'thema' | 'groesse' | 'distanz' | 'eignung' | 'quote' | 'nachweise'
  punkte: number
  max: number
  wert?: string | number | null
  gewonnen?: number
  entschieden?: number
  fehlen?: string[]
  kwp?: number
}

/** Go/No-Go-Vorschlag der Datenbank (0–100). */
export interface GngVorschlag {
  punkte: number
  empfehlung: 'go' | 'pruefen' | 'nogo'
  teile: GngTeil[]
}

/** Eine Zeile des Öffnungsprotokolls. */
export interface Angebot {
  id?: string
  anbieter: string
  ort: string | null
  betrag_rappen: number
  rang?: number | null
  wir: boolean
  bemerkung: string | null
}

/** Eignungsnachweis der Firma. */
export interface Nachweis {
  id: string
  firma_id: string
  art: string
  ausgestellt_am: string
  gueltig_bis: string
  datei_pfad: string | null
  notiz: string | null
}

/** Art eines Nachweises aus der Einstellung. */
export interface NachweisArt {
  art: string
  de: string
  fr: string
  monate: number
}

/** Referenz für Eingaben. */
export interface Referenz {
  id: string
  projekt_id: string | null
  titel: string
  ort: string | null
  leistung_kwp: number | null
  jahr: number | null
  gebaeude: string | null
  auftraggeber: string | null
  ansprechperson: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  freigegeben: boolean
  notiz: string | null
}

/** Mitbewerber aus den Öffnungsprotokollen. */
export interface Mitbewerber {
  anbieter: string
  orte: string | null
  submissionen: number
  erster: number
  abstand_prozent: number | null
  rappen_pro_kwp: number | null
  kantone: string | null
  zuletzt: string | null
}

/** Auswertung der Submissionen in einem Zeitraum. */
export interface Auswertung {
  gemeldet: number
  submissionen: number
  go: number
  nogo: number
  eingereicht: number
  gewonnen: number
  gewonnen_rappen: number
  offen_rappen: number
  abstand_prozent: number | null
  kantone: { kanton: string; eingereicht: number; gewonnen: number }[]
  nogo_gruende: { grund: string; anzahl: number }[]
  anschreiben: number
  leads: number
}

/** Punkt der Eingabe-Checkliste aus der Einstellung. */
export interface ChecklistePunkt {
  schluessel: string
  de: string
  fr: string
  auto?: 'nachweise' | 'pruefung'
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
  gng: number
  pruefung: number
  eingereicht_rappen: number
  nachweise_ablauf: number
  darf_pruefen: boolean
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

/**
 * Reiter der Seite: Leitstand (Board je Spur), Bewilligen (Andy), Senden (Chris), Fristen, Nachweise und
 * Referenzen, Auswertung mit Mitbewerbern, Quellen und Regeln.
 */
export const REITER = ['leitstand', 'bewilligen', 'senden', 'fristen', 'nachweise', 'auswertung', 'quellen'] as const
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
  nachweise: NachweisArt[]
  checkliste: ChecklistePunkt[]
  nogo_gruende: string[]
  pruefen_ab_rappen: number
  post_arbeitstage: number
}
