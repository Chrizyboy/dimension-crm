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
  | 'freigabe'

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
  /** Tage seit Versand (Nachfassen) bzw. seit Eingang (Anfrage), für «warum steht das hier». */
  tage?: number
  /** Wer mir die Aufgabe gegeben hat (nur wenn nicht ich selbst). */
  von?: string
  /** Kanal eines Eintrags im Ausgangskorb (mail, sms, brief). */
  kanal?: string
  /** Postleitzahl des Orts, für das Wetter auf der Baustelle. */
  plz?: string
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
  'freigaben',
  'nachfassen',
  'neue_leads',
  'wiedervorlagen',
  'fristen',
  'zahlungen',
  'service',
  'kontrollen',
] as const
export type TagListeName = (typeof TAG_LISTEN)[number]

/** Schlüssel eines Wochenziels (Anzahlen pro Woche, Aufträge als Betrag pro Monat). */
export type ZielSchluessel = 'leads_neu' | 'termine' | 'gesendet' | 'auftrag_monat_rappen'
export const ZIEL_SCHLUESSEL: ZielSchluessel[] = ['leads_neu', 'termine', 'gesendet', 'auftrag_monat_rappen']

/** Meine Ziele mit Stand (null, wenn für mich keine gesetzt sind). */
export interface MeineZiele {
  woche_von: string
  monat: string
  zeilen: { schluessel: ZielSchluessel; ziel: number; ist: number }[]
}

/** Antwort von `heute_fuer_mich`. */
export type MeinTag = {
  heute: string
  person: { id: string; name: string }
  /** Darf Wochenziele setzen (Administration oder Recht «finanzen»). */
  darf_ziele: boolean
  ziele: MeineZiele | null
} & Record<TagListeName, TagListe>

/** Eine Person in «Team heute» (`team_heute`): wo sie ist, ohne Grund einer Abwesenheit. */
export interface TeamPerson {
  id: string
  name: string
  kuerzel: string
  status: 'abwesend' | 'baustelle' | 'kunde' | 'service' | 'da'
  ort?: string
  zeit?: string
  nummer?: string
  halbtag?: boolean
  standort?: string
}
