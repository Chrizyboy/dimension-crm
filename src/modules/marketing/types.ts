/** Fachliche Typen des Moduls «Marketing» (Phase 11, Entscheid 0022). */

/** Reiter der Seite (#/marketing?ansicht=…). */
export const ANSICHTEN = [
  'uebersicht',
  'kalender',
  'kampagnen',
  'messen',
  'anschreiben',
  'social',
  'newsletter',
  'empfehlungen',
  'mediathek',
  'vorlagen',
] as const
export type Ansicht = (typeof ANSICHTEN)[number]

export type Sprache = 'de' | 'fr'

/** Gruppe wie V233 (stärkste aus Leads, Offerten und Projekten), dazu «ohne Geschäft». */
export const GRUPPEN = ['interessent', 'offerte', 'kunde', 'verloren', 'kein_interesse', 'ohne'] as const
export type Gruppe = (typeof GRUPPEN)[number]

/** Ein Eintrag der Sicht `marketing_zielgruppe`. */
export interface Zielkontakt {
  id: string
  kundennummer: number | null
  name: string
  anrede: string | null
  vorname: string | null
  nachname: string | null
  firma: string | null
  email: string | null
  telefon: string | null
  sprache: Sprache
  strasse: string | null
  plz: string | null
  ort: string | null
  kanton: string | null
  standort: string | null
  stand: string | null
  gruppe: Gruppe
  batterie: boolean | null
  wallbox: boolean | null
  waermepumpe: boolean | null
  anlage_seit: string | null
  werbesperre: boolean
  einwilligung: { datum?: string; quelle?: string; abgemeldet_am?: string; abmelde_grund?: string } | null
  versandgrund: 'kunde' | 'einwilligung' | null
  zuletzt_angeschrieben: string | null
  abmelde_schluessel: string
  /** Heizung laut Gebäuderegister (oel, gas, waermepumpe …), null = noch nicht geprüft. */
  heizung?: string | null
}

/** Filter der Zielgruppe (V233 «Kunden anschreiben»). */
export interface ZielFilter {
  suche: string
  gruppen: Gruppe[]
  kantone: string[]
  sprache: '' | Sprache
  standort: string
  kontakt: '' | 'mail' | 'post'
  anlage: '' | 'ohne_batterie' | 'ohne_wallbox' | 'ohne_waermepumpe' | 'alt' | 'oel_gas'
  abgemeldete: boolean
}

/** Betreff und Text je Sprache. */
export type Zweisprachig<T> = Record<Sprache, T>
export interface Textvorlage {
  betreff: string
  text: string
}

/** Einstellung «marketing»: Vorlagen für Brief, Mail, Abmelde-Satz und Social Media. */
export interface MarketingVorlagen extends MarketingPlanung {
  absender: Zweisprachig<string>
  ort: Zweisprachig<string>
  brief: Zweisprachig<Textvorlage>
  mail: Zweisprachig<Textvorlage>
  abmelden: Zweisprachig<string>
  newsletter_max_woerter: number
  /** Fertige Mail-Entwürfe für die Nachrüst-Zielgruppen (Modul-Prüfung 34B). */
  nachruest?: Partial<Record<Exclude<ZielFilter['anlage'], ''>, Zweisprachig<Textvorlage>>>
  /** Text des Referenz-Posts nach der IBN mit {Ort} und {Anlage}. */
  referenz_post?: Zweisprachig<string>
  social: {
    themen: string[]
    regeln: Partial<Record<Netzwerk, string>>
    ci: string
  }
}

/** Eine Zeile «Letzte Aktionen». */
export interface Kampagne {
  id: string
  art: 'serienbrief' | 'serienmail' | 'newsletter' | 'adressliste'
  betreff: string | null
  anzahl: number | null
  versendet_am: string | null
  versendet_von: string | null
  kampagne_id?: string | null
  newsletter_id?: string | null
}

/** Ein Newsletter mit Segment. */
export interface Newsletter {
  id: string
  thema: string
  segment: NewsletterSegment
  betreff_de: string | null
  betreff_fr: string | null
  text_de: string | null
  text_fr: string | null
  status: 'entwurf' | 'versendet'
  versendet_am: string | null
  versendet_von: string | null
  anzahl: number | null
  erstellt_am: string
  kampagne_id?: string | null
  geplant_am?: string | null
}

export interface NewsletterSegment {
  gruppen?: Gruppe[]
  sprache?: '' | Sprache
  standort?: string
  kantone?: string[]
  einzelne?: boolean
}

/** Empfänger eines Newsletters (newsletter_empfaenger_fuer). */
export interface NewsletterEmpfaenger {
  kontakt_id: string | null
  empfaenger_id: string | null
  email: string
  name: string | null
  anrede: string | null
  vorname: string | null
  nachname: string | null
  firma: string | null
  sprache: Sprache
  versandgrund: string
  abmelde_schluessel: string
  erhalten: boolean
}

/** Social Media. */
export const NETZWERKE = ['instagram', 'facebook', 'linkedin'] as const
export type Netzwerk = (typeof NETZWERKE)[number]
export type PostSprache = 'de' | 'fr' | 'de_fr'
export type PostStatus =
  'idee' | 'entwurf' | 'zur_freigabe' | 'geplant' | 'wird_veroeffentlicht' | 'veroeffentlicht' | 'fehler' | 'erledigt'
export const FORMATE = ['quadrat', 'hoch', 'story', 'quer'] as const
export type Format = (typeof FORMATE)[number]

export interface SocialPost {
  id: string
  thema: string | null
  idee: string | null
  netzwerke: Netzwerk[]
  format: Format | null
  sprache: PostSprache | null
  texte: Partial<Record<Netzwerk, Partial<Record<Sprache, string>>>>
  bilder: string[]
  status: PostStatus
  geplant_am: string | null
  veroeffentlicht_am: string | null
  ergebnis: Partial<Record<Netzwerk, { ok: boolean; url?: string; fehler?: string }>>
  details: {
    quelle?: 'eigen' | 'anlage' | 'tipp'
    anlage_id?: string
    canva?: { id: string; adresse: string }
    /** Ohne Verbindung zum Netzwerk: zur Zeit kommt die Glocke «Jetzt posten». */
    von_hand?: boolean
  }
  kampagne_id?: string | null
  verfasst_von: string | null
  erstellt_am: string
}

/** Verbindung zu Meta, LinkedIn oder Canva (ohne Token). */
export interface SocialVerbindung {
  dienst: 'meta' | 'linkedin' | 'canva'
  name: string | null
  verbunden: boolean
  verbunden_am: string | null
  ablauf: string | null
  fehler: string | null
  von: string | null
  /** Verbundene Seiten (Meta, mit Instagram-Konto falls verknüpft) bzw. Firmenseiten (LinkedIn). */
  konten: SocialKonto[]
  /** Welches Konto je Netzwerk deutsch und welches französisch ist (Seiten-ID bzw. Organisation). */
  zuordnung: Partial<Record<'facebook' | 'instagram' | 'linkedin', Partial<Record<'de' | 'fr', string>>>>
}

/** Eine verbundene Facebook-Seite (mit Instagram) oder LinkedIn-Firmenseite. */
export interface SocialKonto {
  id: string
  name: string
  instagram_id?: string | null
  instagram_name?: string | null
}

/** Verbaute Anlage als Vorlage für einen Post: nur Ort, Leistung und Komponenten, nie der Name (V233). */
export interface Referenzanlage {
  id: string
  ort: string | null
  leistung_kwp: number | null
  module: string | null
  wechselrichter: string | null
  batterie: string | null
  datum: string | null
}

/* --- Marketing vollständig (Entscheid 0055) ------------------------------------------------------------- */

export const KAMPAGNEN_ARTEN = [
  'aktion',
  'messe',
  'online',
  'empfehlung',
  'newsletter',
  'social',
  'gekaufte_leads',
] as const
export type KampagnenArt = (typeof KAMPAGNEN_ARTEN)[number]
export const KAMPAGNEN_STATUS = ['idee', 'vorbereitung', 'laeuft', 'abgeschlossen'] as const
export type KampagnenStatus = (typeof KAMPAGNEN_STATUS)[number]
export const KANAELE = ['online', 'messe', 'gekaufte_leads', 'druck', 'social', 'gutschriften', 'sonstiges'] as const
export type Kanal = (typeof KANAELE)[number]

/** Standdienst an einer Messe: ein Tag mit Zeit und Personen. */
export interface Standdienst {
  tag: string
  von: string
  bis: string
  personen: string[]
}
export interface Checkpunkt {
  text: string
  erledigt: boolean
  von?: string | null
  am?: string | null
}

/** Eine Kampagne (Tabelle marketing_kampagnen). */
export interface Werbekampagne {
  id: string
  name: string
  art: KampagnenArt
  status: KampagnenStatus
  ziel: string | null
  start_am: string | null
  ende_am: string | null
  budget_rappen: number | null
  ziel_leads: number | null
  sprache: 'de' | 'fr' | 'de_fr' | null
  standort_id: string | null
  verantwortlich_id: string | null
  kennzeichen: string | null
  quelle: string | null
  details: { ort?: string; stand?: string; flaeche_m2?: number; standdienst?: Standdienst[]; checkliste?: Checkpunkt[] }
  notiz: string | null
}

/** Zahlen je Kampagne (kampagnen_zahlen). Kosten nur mit Recht preise oder finanzen. */
export interface KampagnenZahlen {
  kampagne_id: string
  erreicht: number
  geoeffnet: number
  geklickt: number
  leads: number
  offerten: number
  auftraege: number
  auftragswert_rappen: number
  kosten_rappen: number | null
}

export interface QuellenZeile {
  quelle: string
  leads: number
  auftraege: number
  auftragswert_rappen: number
  kosten_rappen: number | null
}

export interface BudgetZeile {
  kanal: Kanal
  budget_rappen: number
  kosten_rappen: number
}

/** Lieferantenrechnung aus AbaNinja (kreditor_zahlungen), Ausschnitt für die Zuordnung. */
export interface Kostenbeleg {
  id: string
  firma: string
  text: string | null
  kategorie: string | null
  rechnung_nr: string | null
  rechnung_am: string | null
  betrag_rappen: number | null
  kampagne_id: string | null
  marketing_kanal: string | null
}

/** Ergebnis eines Versands (versand_ergebnisse). */
export interface VersandErgebnis {
  versand_id: string
  gesendet: number
  geoeffnet: number
  geklickt: number
  abgemeldet: number
  leads: number
}

/** Lead einer Kampagne (für Akte, Messe und «Deine Leads aus Marketing»). */
export interface KampagnenLead {
  id: string
  nummer: string
  kontakt_id: string
  kampagne_id: string | null
  quelle: string | null
  eingang_am: string | null
  stufe: string
  tour_person_id: string | null
  name: string
  ort: string | null
  email: string | null
}

export interface GespeicherteZielgruppe {
  id: string
  name: string
  beschreibung: string | null
  filter: ZielFilter
  zuletzt_am: string | null
}

export const WERBEMITTEL_ARTEN = ['flyer', 'broschuere', 'rollup', 'logo', 'vorlage', 'sonstiges'] as const
export interface Werbemittel {
  id: string
  name: string
  art: (typeof WERBEMITTEL_ARTEN)[number]
  sprache: 'de' | 'fr' | 'de_fr' | null
  version: string | null
  link: string | null
  bestand: number | null
  mindestbestand: number | null
  notiz: string | null
}

/** Foto aus einem Rapport (mediathek_fotos), nur Ort und Anlage, nie Name. */
export interface MediathekFoto {
  id: string
  name: string
  speicher_pfad: string | null
  sharepoint_url: string | null
  rapport_id: string
  projekt_nummer: string | null
  ort: string | null
  leistung_kwp: number | null
  batterie: boolean
  datum: string | null
  erlaubt: boolean
  titel: boolean
}

/** Zusätzliche Einstellungen «marketing» (Entscheid 0055). */
export interface MarketingPlanung {
  budget?: Record<string, Partial<Record<Kanal, number>>>
  werbepause_tage?: number
  kosten_stichworte?: string[]
  messe_checkliste?: string[]
  saison_themen?: Record<string, Zweisprachig<string>>
  messe_danke?: Zweisprachig<Textvorlage>
  datenschutz?: Zweisprachig<string>
}

/** KI-Einschätzung der Zufriedenheit vor der Bitte um eine Google-Bewertung. */
export type Einschaetzung = 'zufrieden' | 'unklar' | 'unzufrieden'

/** Bewertungsanfrage nach der IBN (Sicht `bewertungsanfragen_liste`). */
export interface Bewertungsanfrage {
  id: string
  status: 'pruefen' | 'bereit' | 'gesendet' | 'verworfen'
  faellig_am: string
  einschaetzung: Einschaetzung | null
  grund: string | null
  ohne_ki: boolean
  entschieden_am: string | null
  entschieden_von: string | null
  verworfen_grund: string | null
  kontakt_id: string
  projekt_id: string | null
  kunde: string | null
  email: string | null
  werbesperre: boolean
  projekt_nummer: string | null
  ort: string | null
}

/** Empfehlung eines Kunden (Sicht `empfehlungen_liste`). */
export interface Empfehlung {
  id: string
  status: 'lead' | 'auftrag' | 'ausbezahlt' | 'verfallen'
  gutschrift_rappen: number | null
  gutschrift_am: string | null
  ausbezahlt_am: string | null
  erstellt_am: string
  empfehler_id: string
  empfehler: string | null
  verkaufschance_id: string | null
  lead_nummer: string | null
  neukunde: string | null
  projekt_id: string | null
  projekt_nummer: string | null
}
