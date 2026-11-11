/** Fachliche Typen des Moduls «Zeiterfassung» (Entscheid 0059). */

/** Reiter des Bereichs; «team» sieht nur die Zeit-Leitung. */
export const REITER = ['meine', 'abwesenheiten', 'team'] as const
export type ZeitReiter = (typeof REITER)[number]

/** Stand einer Abwesenheit: Antrag, bewilligt (gilt), abgelehnt (zählt nirgends). */
export type AbwesenheitStatus = 'beantragt' | 'bewilligt' | 'abgelehnt'

/** Ferienkonto eines Jahres in Tagen. */
export interface Ferienkonto {
  anspruch: number
  uebertrag: number
  bezogen: number
  geplant: number
  beantragt: number
  rest: number
}

/** Zeitkonto einer Person: Jahr bis heute und gewählte Woche, in Stunden. */
export interface Zeitkonto {
  soll_h: number | null
  ist_h: number | null
  gutschrift_h: number | null
  saldo_h: number
  saldo_uebertrag_h: number
  woche: { soll_h: number; ist_h: number; gutschrift_h: number }
  ferien: Ferienkonto
}

/** Laufende Zeit einer Person (Stempeluhr). */
export interface LaufendeZeit {
  id: string
  start: string
  art: 'arbeit' | 'reise'
  intern: string | null
  projekt_id: string | null
  service_fall_id: string | null
}

/** Person in der Zeiterfassung (nur sichtbare: sich selbst, mit Leitung alle). */
export interface ZeitPerson {
  id: string
  name: string
  kurzzeichen: string | null
  rolle: string
  standort: string | null
  konto: Zeitkonto
  laeuft: LaufendeZeit | null
  heute_weg: string | null
}

/** Abwesenheit mit Antrag und Entscheid. */
export interface Abwesenheit {
  id: string
  person_id: string
  art: string
  von: string
  bis: string
  halbtag: boolean
  status: AbwesenheitStatus
  bemerkung: string | null
  entscheid_grund: string | null
  entscheid_am: string | null
  entscheid_von: string | null
  kurs: boolean
  erstellt_am: string
}

/** Interner Posten zum Stempeln ohne Kunde (Büro, Lager …), aus einstellungen.baustelle. */
export interface Posten {
  schluessel: string
  de: string
  fr: string
}

/** Alles, was der Bereich in einer Abfrage lädt (`zeiterfassung()`). */
export interface Zeiterfassung {
  ich: string
  leitung: boolean
  jahr: number
  montag: string
  personen: ZeitPerson[]
  abwesenheiten: Abwesenheit[]
  /** Offene Anträge aller Jahre (nur für die Zeit-Leitung). */
  offen: Abwesenheit[]
  feiertage: { tag: string; de: string; fr: string }[]
  posten: Posten[]
}

/** Ein Tag einer Person: Soll, Ist, Feiertag, bewilligte Abwesenheit. */
export interface ZeitTag {
  tag: string
  soll_h: number
  ist_h: number
  feiertag: string | null
  art: string | null
  gutschrift_h: number
  ferientag: number
}

/** Eine gestempelte Zeit (Tabelle zeiten), wie sie die Wochenliste zeigt. */
export interface Zeit {
  id: string
  person_id: string
  start: string
  stopp: string | null
  pause_min: number
  art: 'arbeit' | 'reise'
  intern: string | null
  projekt_id: string | null
  service_fall_id: string | null
  notiz: string | null
  freigegeben_am: string | null
  exportiert_am: string | null
  projekte: { nummer: string | null } | null
}

/** Eingabe für Abwesenheit erfassen oder ändern. */
export interface AbwesenheitEingabe {
  id?: string
  person_id: string
  art: string
  von: string
  bis: string
  halbtag: boolean
  bemerkung: string
}
