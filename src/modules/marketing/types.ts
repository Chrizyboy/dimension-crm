/** Fachliche Typen des Moduls «Marketing» (Phase 11, Entscheid 0022). */

/** Reiter der Seite (#/marketing?ansicht=…). */
export const ANSICHTEN = ['anschreiben', 'social', 'newsletter', 'vorlagen'] as const
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
}

/** Filter der Zielgruppe (V233 «Kunden anschreiben»). */
export interface ZielFilter {
  suche: string
  gruppen: Gruppe[]
  kantone: string[]
  sprache: '' | Sprache
  standort: string
  kontakt: '' | 'mail' | 'post'
  anlage: '' | 'ohne_batterie' | 'ohne_wallbox' | 'ohne_waermepumpe' | 'alt'
  abgemeldete: boolean
}

/** Betreff und Text je Sprache. */
export type Zweisprachig<T> = Record<Sprache, T>
export interface Textvorlage {
  betreff: string
  text: string
}

/** Einstellung «marketing»: Vorlagen für Brief, Mail, Abmelde-Satz und Social Media. */
export interface MarketingVorlagen {
  absender: Zweisprachig<string>
  ort: Zweisprachig<string>
  brief: Zweisprachig<Textvorlage>
  mail: Zweisprachig<Textvorlage>
  abmelden: Zweisprachig<string>
  newsletter_max_woerter: number
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
export type PostStatus = 'entwurf' | 'geplant' | 'wird_veroeffentlicht' | 'veroeffentlicht' | 'fehler' | 'erledigt'
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
  details: { quelle?: 'eigen' | 'anlage' | 'tipp'; anlage_id?: string; canva?: { id: string; adresse: string } }
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
