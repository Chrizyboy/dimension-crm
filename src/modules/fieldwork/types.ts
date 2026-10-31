/** Fachliche Typen des Moduls «Baustelle & Rapporte». */

/** Reiter der Seite (#/fieldwork?reiter=…). «tag» ist die Handy-Ansicht der Monteure. */
export const REITER = ['tag', 'rapporte', 'zeiten', 'nachtraege'] as const
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

/** Ein Eintrag im Tagesplan: Einsatz auf einer Baustelle oder Service-Termin. */
export interface TagEintrag {
  typ: 'einsatz' | 'service'
  id: string
  von: string
  bis: string
  zeit: string | null
  notiz: string | null
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
  service?: {
    id: string
    nummer: string
    titel: string | null
    garantie: boolean | null
    prioritaet: string | null
    kategorie: string | null
  }
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
}

/** Felder, die der Monteur im Rapport ändert (alle optional: nur Gesendetes wird gespeichert; Prüfpunkte werden zusammengeführt). */
export type RapportEingabe = Partial<
  Pick<Rapport, 'arbeiten' | 'material' | 'pruefpunkte' | 'montage_fertig' | 'verrechnung' | 'notiz_intern' | 'datum'>
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

/** Prüfpunkt des IBN-Protokolls (Liste in `einstellungen.ibn_pruefpunkte`). */
export interface Pruefpunkt {
  schluessel: string
  de: string
  fr: string
  art: 'ja_nein' | 'wert'
  einheit?: string
}

/** Foto oder Unterschrift eines Rapports; «lokal» = noch in der Warteschlange am Handy. */
export interface RapportBild {
  id: string
  name: string
  ordner: string
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
