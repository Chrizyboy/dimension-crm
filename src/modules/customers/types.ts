/** Fachliche Typen des Moduls «Kunden»: die 360°-Kundenakte. */
import type { Database, Json } from '@/types/datenbank'

type Tabelle<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type Kontakt = Tabelle<'kontakte'>
export type Objekt = Tabelle<'objekte'>
export type Verkaufschance = Tabelle<'verkaufschancen'>
export type Offerte = Tabelle<'offerten'>
export type Projekt = Tabelle<'projekte'>
export type Werkvertrag = Tabelle<'werkvertraege'>
export type Anlage = Tabelle<'anlagen'>
export type ServiceFall = Pick<
  Tabelle<'service_faelle'>,
  | 'id'
  | 'nummer'
  | 'titel'
  | 'status'
  | 'kategorie'
  | 'garantie'
  | 'termin_am'
  | 'erledigt_am'
  | 'erstellt_am'
  | 'anlage_id'
>
export type Wartungsvertrag = Pick<
  Tabelle<'wartungsvertraege'>,
  | 'id'
  | 'nummer'
  | 'paket'
  | 'status'
  | 'preis_netto_rappen'
  | 'naechste_wartung'
  | 'start_am'
  | 'laufzeit_jahre'
  | 'anlage_id'
>
export type Rechnungszeile = Pick<
  Database['public']['Views']['rechnungen_liste']['Row'],
  | 'id'
  | 'nummer'
  | 'titel'
  | 'status'
  | 'datum'
  | 'faellig_am'
  | 'total_rappen'
  | 'offen_rappen'
  | 'bezahlt_rappen'
  | 'bezahlt_am'
  | 'mahnstufe'
  | 'ueberfaellig'
>
export type Aufgabe = Pick<
  Tabelle<'aufgaben'>,
  'id' | 'titel' | 'text' | 'faellig_am' | 'person_id' | 'bezug_tabelle' | 'bezug_id'
>
/** Mail an oder von der Person, aus Posteingang (`ein`) oder Ausgangskorb (`aus`). */
export interface Mailzeile {
  id: string
  richtung: 'ein' | 'aus'
  zeitpunkt: string
  betreff: string
  wer: string | null
  status: string | null
}
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
  /** Kundenordner im SharePoint-Backup des alten CRM (V233 «Kunden Backup»), meist einer. */
  backupOrdner: BackupOrdner[]
}

/** Ordner im SharePoint-Backup des alten CRM. */
export type BackupOrdner = Pick<Tabelle<'sharepoint_ordner'>, 'id' | 'name' | 'url'>

/** Was nach dem Verkauf am Kontakt hängt: Anlagen, Service, Wartung, Rechnungen, Aufgaben, Mails. */
export interface Nachverkauf {
  anlagen: Anlage[]
  serviceFaelle: ServiceFall[]
  wartungsvertraege: Wartungsvertrag[]
  rechnungen: Rechnungszeile[]
  aufgaben: Aufgabe[]
  mails: Mailzeile[]
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
