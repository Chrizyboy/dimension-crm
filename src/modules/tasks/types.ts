/** Ein Teilschritt einer Aufgabe («Eigenverbrauch rechnen», «Anrufen»). */
export interface Teilschritt {
  id: string
  text: string
  erledigt: boolean
}

/** Wie oft eine Aufgabe wiederkommt; nach dem Erledigen legt die Datenbank die nächste an. */
export type Wiederholung = 'woche' | 'monat' | 'quartal' | 'jahr'

/** Woher eine Aufgabe kommt (von der Datenbank hergeleitet, siehe Sicht `aufgaben_liste`). */
export type Herkunft = 'automation' | 'monitor' | 'frist' | 'system' | 'selbst' | 'person' | 'ki' | 'posteingang'

/** Eine Aufgabe aus der Sicht `aufgaben_liste`: mit Bezug-Name, Herkunft, Kommentaren und Vertretung. */
export interface Aufgabe {
  id: string
  titel: string
  text: string | null
  faellig_am: string | null
  person_id: string | null
  bezug_tabelle: string | null
  bezug_id: string | null
  bezug_name: string | null
  lauf_id: string | null
  erledigt_am: string | null
  erledigt_von: string | null
  erledigt_notiz: string | null
  erstellt_am: string
  ersteller_id: string | null
  wichtig: boolean
  teilschritte: Teilschritt[]
  wiederholung: Wiederholung | null
  herkunft: Herkunft
  kommentare: number
  vertretung: boolean
}

/** Kommentar im Verlauf einer Aufgabe. */
export interface Kommentar {
  id: string
  text: string
  person_id: string | null
  erstellt_am: string
}

/** Person für «Für wen» (Kurzzeichen für die runden Kürzel). */
export interface Person {
  id: string
  kuerzel: string
  name: string
}

/** Eine Zeile der Team-Sicht (person_id null = nicht zugeteilt). */
export interface TeamZeile {
  person_id: string | null
  name: string | null
  kuerzel: string | null
  offen: number
  ueberfaellig: number
  heute: number
  erledigt_7: number
  abwesend: boolean
}

/** Ansichten der Seite «Aufgaben». */
export const ANSICHTEN = ['meine', 'vergeben', 'vertretung', 'alle', 'team', 'erledigt'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Felder, die sich in der Akte ändern lassen. */
export type AufgabeAenderung = Partial<
  Pick<Aufgabe, 'titel' | 'text' | 'faellig_am' | 'person_id' | 'wichtig' | 'teilschritte' | 'wiederholung'>
>
