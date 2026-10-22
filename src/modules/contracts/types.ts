/** Fachliche Typen des Moduls «Wartungsverträge» (Phase 9, V233 «Verträge»). */

/** Filter der Liste: aktive, fällig in 30 Tagen, alle. */
export const FILTER = ['aktiv', 'faellig', 'alle'] as const
export type Filter = (typeof FILTER)[number]

export const STATUS = ['aktiv', 'gekuendigt', 'beendet'] as const

/** Eine Leistung aus dem Katalog (Einstellung «wartung_leistungen»). */
export interface Leistung {
  de: string
  fr: string
  standard?: boolean
}

/** Eintrag im Verlauf: eine durchgeführte Wartung. */
export interface Wartung {
  am: string
  person_id: string | null
  notiz: string | null
}

/** Ein Wartungsvertrag (W001 …). */
export interface Vertrag {
  id: string
  nummer: string | null
  status: string
  kontakt_id: string
  projekt_id: string | null
  anlage_id: string | null
  start_am: string | null
  laufzeit_jahre: number
  rhythmus_monate: number | null
  preis_rappen: number | null
  leistungen: Leistung[]
  letzte_wartung: string | null
  naechste_wartung: string | null
  sprache: 'de' | 'fr'
  notiz: string | null
  verlauf: Wartung[]
  kunde: string
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
  | 'start_am'
  | 'laufzeit_jahre'
  | 'rhythmus_monate'
  | 'preis_rappen'
  | 'leistungen'
  | 'sprache'
  | 'notiz'
>
