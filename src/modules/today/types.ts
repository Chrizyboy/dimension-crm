/** Fachliche Typen des Moduls «Mein Tag». Die Daten liefert die Datenbank-Funktion `heute_fuer_mich`. */

/** Art einer Zeile: bestimmt Symbol und Text. */
export type TagArt =
  | 'besichtigung'
  | 'service'
  | 'einsatz'
  | 'kalender'
  | 'aufgabe'
  | 'nachfassen'
  | 'lead'
  | 'wiedervorlage'
  | 'frist'
  | 'zahlung'
  | 'fall'
  | 'kontrolle'
  | 'wartung'

/** Eine Zeile in einer Karte: was, wann und wohin ein Klick führt. */
export interface TagZeile {
  art: TagArt
  datum?: string
  zeit?: string
  titel: string
  unter?: string
  telefon?: string
  tabelle?: string
  id?: string
  aufgabe_id?: string
  ueberfaellig?: boolean
  betrag_rappen?: number
  prioritaet?: string
  status?: string
  name_fr?: string
  bewilligung?: boolean
}

/** Liste mit Gesamtzahl; `zeilen` ist auf 20 bis 30 gekürzt. */
export interface TagListe {
  anzahl: number
  zeilen: TagZeile[]
}

/** Die Listen von «Mein Tag», in der Reihenfolge der Seite. */
export const TAG_LISTEN = [
  'termine',
  'aufgaben',
  'vergeben',
  'nachfassen',
  'neue_leads',
  'wiedervorlagen',
  'fristen',
  'zahlungen',
  'service',
  'kontrollen',
] as const
export type TagListeName = (typeof TAG_LISTEN)[number]

/** Antwort von `heute_fuer_mich`. */
export type MeinTag = { heute: string; person: { id: string; name: string } } & Record<TagListeName, TagListe>
