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

/** Personal-Akte: sehen nur die Administration und die Person selbst; Notiz nur die Administration. */
export interface PersonalAkte {
  id: string | null
  person_id: string
  eintritt: string | null
  austritt: string | null
  pensum: number | null
  geburtsdatum: string | null
  telefon_privat: string | null
  notfall_name: string | null
  notfall_telefon: string | null
  kleidergroesse: string | null
  schuhgroesse: string | null
  notiz: string | null
}

/** Stand einer Zelle der Übersicht «wer darf was». */
export type ZellenStand = 'gueltig' | 'bald' | 'abgelaufen' | 'fehlt' | 'leer'

/** Eine Ausweis-Art aus der Auswahlliste «qualifikation». */
export interface AusweisArt {
  schluessel: string
  gueltig_monate: number | null
  pflicht_fuer: string[]
}
