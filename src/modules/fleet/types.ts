/** Fachliche Typen des Moduls «Fahrzeuge & Geräte». */

/** Firmenfahrzeug mit MFK, Service und Kilometerstand. */
export interface Fahrzeug {
  id: string
  kennzeichen: string
  bezeichnung: string
  marke_modell: string | null
  jahrgang: number | null
  standort_id: string | null
  person_id: string | null
  km_stand: number | null
  km_stand_am: string | null
  naechste_mfk: string | null
  naechster_service: string | null
  service_km: number | null
  leasing_bis: string | null
  versicherung: string | null
  ausser_betrieb: boolean
  notiz: string | null
}

export type GeraetZustand = 'ok' | 'maengel' | 'defekt' | 'ausser_betrieb'

/** Gerät (Messgerät, Absturzsicherung, Leiter …) mit Prüfintervall und wer es gerade hat. */
export interface Geraet {
  id: string
  art: string
  bezeichnung: string
  inventar_nr: string | null
  serien_nr: string | null
  hersteller: string | null
  standort_id: string | null
  person_id: string | null
  fahrzeug_id: string | null
  pruef_monate: number | null
  naechste_pruefung: string | null
  zustand: GeraetZustand
  notiz: string | null
}

/** Eintrag im Verlauf: MFK, Service, Prüfung, Schaden, Übergabe … */
export interface Eintrag {
  id: string
  art: string
  datum: string
  km: number | null
  kosten_rappen: number | null
  ergebnis: 'ok' | 'maengel' | null
  naechste_am: string | null
  text: string | null
  person: string | null
  erstellt_am: string
}

/** Eine Frist aus der Sicht `fristen` (alle Bereiche). */
export interface Frist {
  art: 'mfk' | 'service' | 'pruefung' | 'ausweis'
  bezug_tabelle: 'fahrzeuge' | 'geraete' | 'qualifikationen'
  bezug_id: string
  titel: string
  faellig_am: string
  person_id: string | null
  standort_id: string | null
}

/** Stand einer Frist: vorbei, innerhalb des Vorlaufs oder später. */
export type FristStand = 'ueberfaellig' | 'bald' | 'ok'

/** Person oder Standort für Auswahlfelder. */
export interface Wahl {
  id: string
  name: string
}

export const ANSICHTEN = ['fahrzeuge', 'geraete', 'fristen'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Neuer Eintrag aus dem Formular; Fahrzeug oder Gerät. */
export interface NeuerEintrag {
  fahrzeug_id: string | null
  geraet_id: string | null
  art: string
  datum: string
  km: number | null
  kosten_rappen: number | null
  ergebnis: 'ok' | 'maengel' | null
  naechste: string | null
  text: string | null
}
