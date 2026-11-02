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
export type ZellenStand = 'gueltig' | 'bald' | 'abgelaufen' | 'fehlt' | 'leer'

/** Eine Ausweis-Art aus der Auswahlliste «qualifikation». */
export interface AusweisArt {
  schluessel: string
  gueltig_monate: number | null
  pflicht_fuer: string[]
}
