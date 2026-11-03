/** Fachliche Typen des Moduls «Team & Ausweise». */

/** Person im Team (aktiv), mit Rolle für die Pflicht-Ausweise. */
export interface Mitglied {
  id: string
  name: string
  rolle: string
  rolle_de: string
  rolle_fr: string
  standort_id: string | null
}

/** Kurs oder Ausweis einer Person; der neuste Eintrag je Art gilt. */
export interface Qualifikation {
  id: string
  person_id: string
  art: string
  bezeichnung: string | null
  erworben_am: string | null
  gueltig_bis: string | null
  aussteller: string | null
  datei_pfad: string | null
  notiz: string | null
  kurs_id?: string | null
}

/**
 * Personal-Akte. Die Datenbank liefert nur, was die angemeldete Person sehen darf (`sicht`): Recht «personal»
 * alles, die Person selbst alles ausser Lohn und Notiz, Vorgesetzte nur Anstellung und Notfallkontakt.
 */
export interface PersonalAkte {
  id: string | null
  person_id: string
  // Anstellung
  vorgesetzt_id: string | null
  funktion: string | null
  vertragsart: string | null
  eintritt: string | null
  befristet_bis: string | null
  probezeit_bis: string | null
  austritt: string | null
  austrittsgrund: string | null
  pensum: number | null
  wochenstunden: number | null
  ferientage: number | null
  kuendigungsfrist_monate: number | null
  vertrag_unterschrieben_am: string | null
  naechstes_gespraech: string | null
  // Persönlich
  geburtsdatum: string | null
  telefon_privat: string | null
  mail_privat: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  nationalitaet: string | null
  bewilligung: string | null
  bewilligung_bis: string | null
  zivilstand: string | null
  ahv_nr: string | null
  iban: string | null
  notfall_name: string | null
  notfall_beziehung: string | null
  notfall_telefon: string | null
  kleidergroesse: string | null
  hosengroesse: string | null
  schuhgroesse: string | null
  notiz: string | null
}

/** Wer die Akte gerade liest: Recht «personal», die Person selbst oder ihre/ihr Vorgesetzte/r. */
export type AkteSicht = 'personal' | 'selbst' | 'vorgesetzt'

/** Lohn zur Info (abgerechnet wird in AbaNinja), nur mit Recht «personal». */
export interface Lohn {
  id: string
  gueltig_ab: string
  lohnart: 'monat' | 'stunde'
  betrag_rappen: number
  anzahl_loehne: 12 | 13 | null
  notiz: string | null
}

/** Mitarbeitergespräch. */
export interface Gespraech {
  id: string
  datum: string
  art: string
  notiz: string | null
  gefuehrt_von: string | null
}

/** Dokument der Akte (Vertrag, Bewilligung, Zeugnis …) im privaten Speicher. */
export interface Dokument {
  id: string
  art: string
  titel: string
  datum: string | null
  datei_pfad: string
}

/** Alles zur Akte einer Person, wie es die Funktion `personal_akte` liefert. */
export interface AkteDaten {
  sicht: AkteSicht
  akte: PersonalAkte
  vorgesetztName: string | null
  loehne: Lohn[] | null
  gespraeche: Gespraech[]
  dokumente: Dokument[]
  ausruestung: string[]
}

/** Stand einer Zelle der Übersicht «wer darf was». */
export type ZellenStand = 'gueltig' | 'bald' | 'abgelaufen' | 'fehlt' | 'geplant' | 'leer'

/** Eine Ausweis-Art aus der Auswahlliste «qualifikation». */
export interface AusweisArt {
  schluessel: string
  gueltig_monate: number | null
  pflicht_fuer: string[]
}

/** Was eine Person an einem Tag tut (aus Abwesenheit, Kurs, Montage-Einsatz oder Service-Termin). */
export type Heute =
  | { art: 'abwesend'; bis: string; halbtag: boolean; grund: string | null }
  | { art: 'kurs'; bis: string; titel: string | null }
  | { art: 'einsatz'; nummer: string | null; ort: string | null; projekt_id: string }
  | { art: 'service'; nummer: string | null; zeit: string | null }

/** Person in der Team-Übersicht: Kontakt, Funktion, Vorgesetzt und «Heute». */
export interface TeamPerson extends Mitglied {
  kuerzel: string
  standort: string | null
  sprache: 'de' | 'fr'
  email: string | null
  telefon: string | null
  funktion: string | null
  eintritt: string | null
  vorgesetzt_id: string | null
  vorgesetzt_name: string | null
  heute: Heute | null
}

/** Stand eines Kurses: Antrag, bewilligt, angemeldet (Datum fix, Tag gesperrt), besucht (Ausweis da) oder abgesagt. */
export type KursStand = 'beantragt' | 'bewilligt' | 'angemeldet' | 'besucht' | 'abgesagt'

/** Kurs oder Weiterbildung. Kosten und Vereinbarung fehlen, wenn man sie nicht sehen darf. */
export interface Kurs {
  id: string
  titel: string
  art: string | null
  anbieter: string | null
  ort: string | null
  von: string | null
  bis: string | null
  personen: string[]
  besucht_von: string[]
  stand: KursStand
  beantragt_von: string | null
  beantragt_name: string | null
  bewilligt_name: string | null
  bewilligt_am: string | null
  absage_grund: string | null
  notiz: string | null
  kosten_rappen?: number | null
  vereinbarung_rappen?: number | null
  vereinbarung_bis?: string | null
  darf_planen: boolean
  darf_bewilligen: boolean
}

/** Kurse eines Jahres mit Budget (nur mit Recht) und Grenzen aus den Einstellungen. */
export interface KursJahr {
  jahr: number
  grenze_rappen: number
  vereinbarung_ab_rappen: number
  budget_rappen: number | null
  darf: { alle_kosten: boolean; personal: boolean }
  kurse: Kurs[]
}

/** Eingabe für einen Kurs (anlegen oder ändern). */
export interface KursEingabe {
  titel: string
  art: string | null
  anbieter: string | null
  ort: string | null
  von: string | null
  bis: string | null
  kosten_rappen: number | null
  personen: string[]
  stand: 'beantragt' | 'bewilligt' | 'angemeldet'
  vereinbarung_rappen: number | null
  vereinbarung_bis: string | null
  notiz: string | null
}

/** Reiter der Seite. */
export const REITER = ['team', 'ausweise', 'kurse', 'anforderungen'] as const
export type TeamReiter = (typeof REITER)[number]

/** Geburtstag oder Dienstjubiläum (nur Tag und Monat; beim Jubiläum die vollen Jahre). */
export interface Anlass {
  person_id: string
  name: string
  kurzzeichen: string | null
  art: 'geburtstag' | 'jubilaeum'
  datum: string
  jahre?: number
}

/** Antwort von team_anlaesse(). */
export interface Anlaesse {
  ich_verborgen: boolean
  anlaesse: Anlass[]
}

/** Pflicht-Ausweise einer Tätigkeit (Liste «taetigkeit»). */
export interface TaetigkeitRegel {
  schluessel: string
  ausweise: string[]
  wer: 'alle' | 'einer'
  immer: boolean
}
