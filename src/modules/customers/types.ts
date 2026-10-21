/** Fachliche Typen des Moduls «Kunden»: die 360°-Kundenakte. */
import type { Database, Json } from '@/types/datenbank'

type Tabelle<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type Kontakt = Tabelle<'kontakte'>
export type Objekt = Tabelle<'objekte'>
export type Verkaufschance = Tabelle<'verkaufschancen'>
export type Offerte = Tabelle<'offerten'>
export type Projekt = Tabelle<'projekte'>
export type Werkvertrag = Tabelle<'werkvertraege'>
export type Dokument = Pick<
  Tabelle<'dokumente'>,
  | 'id'
  | 'name'
  | 'mime_typ'
  | 'bytes'
  | 'ordner'
  | 'speicher'
  | 'speicher_pfad'
  | 'sharepoint_url'
  | 'bezug_tabelle'
  | 'bezug_id'
  | 'hochgeladen_am'
  | 'erstellt_am'
>

/** Alles, was an einem Kontakt hängt, für die Kundenakte auf einmal geladen. */
export interface Kundenakte {
  kontakt: Kontakt
  objekte: Objekt[]
  verkaufschancen: Verkaufschance[]
  offerten: Offerte[]
  projekte: Projekt[]
  werkvertraege: Werkvertrag[]
  dokumente: Dokument[]
}

/** Ein Eintrag der Zeitachse, wie ihn `kunden_zeitachse` liefert. */
export interface Zeitachseneintrag {
  zeitpunkt: string
  /** z. B. 'aktivitaet:anruf', 'offerte', 'baubeginn', 'aenderung:geaendert'. */
  art: string
  text: string
  daten: Record<string, Json | undefined>
  bezugTabelle: string
  bezugId: string
  wer: string | null
}

/** Treffer der Dublettenprüfung beim Anlegen oder Ändern. */
export interface Dublette {
  id: string
  kundennummer: number
  name: string
  ort: string | null
  grund: 'email' | 'telefon' | 'name'
}

/** Die Reiter der Kundenakte, auch in der Adresse (?reiter=…), damit man direkt hinspringen kann. */
export type AkteReiter = 'uebersicht' | 'zeitachse' | 'dokumente'
