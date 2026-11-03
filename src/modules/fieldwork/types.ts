/** Fachliche Typen des Moduls «Baustelle & Rapporte». */
import type { BaustellenInfo, Seriennummer, Sicherheit } from './typenBaustelle'

export * from './typenBaustelle'
export * from './typenLeitung'

/**
 * Reiter der Seite (#/fieldwork?reiter=…). «tag» ist die Handy-Ansicht der Monteure; «heute», «baustellen»,
 * «meldungen» und «auswertung» sind für Projektleitung und GL (Recht preise).
 */
export const REITER = [
  'tag',
  'heute',
  'wochenplan',
  'baustellen',
  'rapporte',
  'zeiten',
  'nachtraege',
  'meldungen',
  'auswertung',
] as const
/** Reiter nur mit Recht «preise». */
export const REITER_LEITUNG: readonly Reiter[] = ['heute', 'baustellen', 'meldungen', 'auswertung']
export type Reiter = (typeof REITER)[number]

export const RAPPORT_ARTEN = ['montage', 'service', 'wartung', 'ibn'] as const
export type RapportArt = (typeof RAPPORT_ARTEN)[number]

export const VERRECHNUNG = ['garantie', 'kostenpflichtig', 'kulanz', 'vertrag'] as const
export type Verrechnung = (typeof VERRECHNUNG)[number]

export const RAPPORT_FILTER = ['offen', 'abgeschlossen', 'alle'] as const
export type RapportFilter = (typeof RAPPORT_FILTER)[number]

export type NachtragStatus = 'offen' | 'vom_kunden_bestaetigt' | 'abgelehnt' | 'verrechnet'
export const NACHTRAG_FILTER = ['offen', 'vom_kunden_bestaetigt', 'abgelehnt', 'alle'] as const
export type NachtragFilter = (typeof NACHTRAG_FILTER)[number]

export type ZeitArt = 'arbeit' | 'reise'

/** Adresse der Baustelle (Objekt), mit Koordinaten für die Navigation. */
export interface Adresse {
  strasse: string | null
  plz: string | null
  ort: string | null
  breite: number | null
  laenge: number | null
}

/** Kurzangaben eines Rapports, wie sie im Tagesplan erscheinen. */
export interface RapportKurz {
  id: string
  nummer: string
  art: RapportArt
  datum: string
  abgeschlossen_am: string | null
}

/** Ein Eintrag im Tagesplan: Einsatz auf einer Baustelle, Service-Termin oder Inspektion (Wartungsvertrag). */
export interface TagEintrag {
  typ: 'einsatz' | 'service' | 'wartung'
  id: string
  von: string
  bis: string
  zeit: string | null
  notiz: string | null
  /** Service-Termin liegt in der Vergangenheit, Fall noch offen: steht deshalb auf heute. */
  ueberfaellig?: boolean
  /** Ursprünglicher Termin-Tag des Service-Falls. */
  termin_tag?: string | null
  projekt: {
    id: string
    nummer: string
    titel: string | null
    bau_status?: string | null
    elektriker?: string | null
  } | null
  kunde: { name: string | null; telefon: string | null; email: string | null; sprache: 'de' | 'fr' | null }
  adresse: Adresse
  team: string[]
  material: { zeilen: number; fehlt: number } | null
  rapporte: RapportKurz[]
  /** Inspektion aus einem Wartungsvertrag: Paket entscheidet über die Messungen, «bis» ist das Ende des Zeitfensters. */
  wartung?: { id: string; nummer: string | null; paket: string | null; kwp: number | null; bis: string | null }
  /** Zusätze aus `baustellen_infos` (nur Einsätze): Schritte, Pflichtfotos, Soll/Ist, Team mit IDs. */
  info?: BaustellenInfo | null
  service?: {
    id: string
    nummer: string
    titel: string | null
    garantie: boolean | null
    prioritaet: string | null
    kategorie: string | null
    auswirkung?: string | null
    komponente?: string | null
    fehlercode?: string | null
    dauer_minuten?: number | null
    vor_ort_name?: string | null
    vor_ort_telefon?: string | null
    zugang?: string | null
    checkliste?: ServiceSchritt[]
    /** Schon «Vor Ort angekommen» gemeldet (Verlauf des Falls). */
    angekommen?: boolean
    anlage?: {
      id: string
      leistung_kwp: number | null
      komponenten: ServiceKomponente[]
      monitoring: { hersteller?: string | null; link?: string | null } | null
    } | null
  }
}

/** Schritt der Service-Checkliste (Texte DE/FR aus den Einstellungen). */
export interface ServiceSchritt {
  de: string
  fr: string
  erledigt_am: string | null
  person_id: string | null
}

/** Komponente der Anlage mit Seriennummer (am Handy änderbar, z. B. nach Tausch). */
export interface ServiceKomponente {
  art?: string | null
  hersteller?: string | null
  modell?: string | null
  anzahl?: number | null
  seriennummer?: string | null
}

/** Die laufende Zeit der Person (Start gedrückt, Stopp noch nicht). */
export interface LaufendeZeit {
  id: string
  start: string
  rapport_id: string | null
  projekt_id: string | null
  art: ZeitArt
}

/** Abwesenheit der eigenen Person (Sicht `abwesenheiten_alle`); Art aus der Auswahlliste «abwesenheit». */
export interface Abwesenheit {
  id: string
  art: string
  von: string
  bis: string
  halbtag: boolean
}

/** Antwort von `mein_tag`. */
export interface MeinTag {
  person_id: string | null
  laufend: LaufendeZeit | null
  eintraege: TagEintrag[]
}

/** Zeile Mehrmaterial im Rapport (frei erfasst, Menge und Einheit). */
export interface MaterialZeile {
  text: string
  menge: number | null
  einheit: string | null
}

/** Unterschrift des Kunden (Bild als Dokument) oder Grund, warum sie fehlt. */
export interface Unterschrift {
  name?: string
  dokument_id?: string
  ohne?: string
  am?: string
}

/** Ein Rapport aus der Sicht «rapporte_liste». */
export interface Rapport {
  id: string
  nummer: string
  art: RapportArt
  datum: string
  projekt_id: string | null
  service_fall_id: string | null
  wartungsvertrag_id: string | null
  einsatz_id: string | null
  person_id: string | null
  person: string | null
  arbeiten: string | null
  material: MaterialZeile[]
  pruefpunkte: Record<string, string | boolean | null>
  montage_fertig: boolean
  verrechnung: Verrechnung | null
  notiz_intern: string | null
  unterschrift_kunde: Unterschrift | null
  abgeschlossen_am: string | null
  projekt_nummer: string | null
  kunde: string | null
  objekt_strasse: string | null
  objekt_plz: string | null
  objekt_ort: string | null
  service_nummer: string | null
  stunden: number | null
  fotos_anzahl: number
  nachtraege_anzahl: number
  team: string[]
  schritte: Record<string, boolean>
  sicherheit: Sicherheit | null
  seriennummern: Seriennummer[]
  vorbehalte: { text: string }[]
  visiert_am: string | null
  visiert_von_name: string | null
  rueckfrage: string | null
}

/** Felder, die der Monteur im Rapport ändert (alle optional: nur Gesendetes wird gespeichert; Prüfpunkte werden zusammengeführt). */
export type RapportEingabe = Partial<
  Pick<
    Rapport,
    | 'arbeiten'
    | 'material'
    | 'pruefpunkte'
    | 'montage_fertig'
    | 'verrechnung'
    | 'notiz_intern'
    | 'datum'
    | 'schritte'
    | 'sicherheit'
    | 'seriennummern'
    | 'vorbehalte'
  >
>

/** Neuer Rapport: Art und Bezug (Projekt, Service-Fall oder Wartungsvertrag). */
export interface NeuerRapport {
  id: string
  art: RapportArt
  datum: string
  projekt_id?: string | null
  service_fall_id?: string | null
  wartungsvertrag_id?: string | null
  einsatz_id?: string | null
  verrechnung?: Verrechnung | null
}

/** Eine erfasste Zeit aus der Sicht «zeiten_liste». */
export interface Zeit {
  id: string
  person_id: string
  person: string | null
  person_kuerzel: string | null
  projekt_id: string | null
  projekt_nummer: string | null
  rapport_id: string | null
  rapport_nummer: string | null
  start: string
  stopp: string | null
  pause_min: number
  art: ZeitArt
  notiz: string | null
  tag: string
  stunden: number | null
  freigegeben_am: string | null
  exportiert_am: string | null
}

/** Ein Nachtrag (Regie) aus der Sicht «nachtraege_liste». */
export interface Nachtrag {
  id: string
  nummer: string
  projekt_id: string | null
  projekt_nummer: string | null
  kunde: string | null
  rapport_id: string | null
  rapport_nummer: string | null
  person: string | null
  beschreibung: string
  stunden: number | null
  material: MaterialZeile[]
  betrag_rappen: number | null
  status: NachtragStatus
  bestaetigt_am: string | null
  abgelehnt_grund: string | null
  erstellt_am: string
}

/** Ein Pflichtfoto je Rapport-Art (Liste in `einstellungen.baustelle.pflichtfotos`). */
export interface Pflichtfoto {
  schluessel: string
  de: string
  fr: string
}

/**
 * Prüfpunkt des IBN-Protokolls (`einstellungen.ibn_pruefpunkte`) oder der Inspektion (`wartung_pakete.pruefpunkte`);
 * `nur_messung` gilt nur für Pakete mit Messungen (Premium).
 */
export interface Pruefpunkt {
  schluessel: string
  de: string
  fr: string
  art: 'ja_nein' | 'wert'
  einheit?: string
  nur_messung?: boolean
}

/** Werte der letzten Inspektion (oder des IBN-Protokolls) für den Vergleich am Handy. */
export interface Vorjahr {
  datum: string
  quelle: 'wartung' | 'ibn'
  werte: Record<string, string | boolean | null>
}

/** Was die Inspektion am Handy braucht: Prüfpunkte des Pakets, Vorjahr und ab wie viel Prozent eine Abweichung auffällt. */
export interface WartungPruefung {
  punkte: Pruefpunkt[]
  vorjahr: Vorjahr | null
  abweichung_prozent: number
}

/** Foto oder Unterschrift eines Rapports; «lokal» = noch in der Warteschlange am Handy. */
export interface RapportBild {
  id: string
  name: string
  ordner: string
  /** Pflichtfoto-Kategorie (z. B. «vorher», «typenschild»), sonst null. */
  kategorie: string | null
  speicher_pfad: string | null
  lokal: boolean
}

/** Treffer der Projektsuche für «Neuer Rapport». */
export interface ProjektTreffer {
  id: string
  nummer: string
  titel: string | null
  kunde: string | null
}

/** Nachtrag, wie ihn der Monteur erfasst. */
export interface NachtragEingabe {
  id: string
  beschreibung: string
  stunden: number | null
  material: MaterialZeile[]
}
