/** Fachliche Typen des Moduls «Preise». Beträge in Rappen; Marge, Skonto und Rabatt als Anteil (0.25 = 25 %). */

export type PreisAnsicht = 'liste' | 'aenderungen' | 'kalkulation' | 'regeln' | 'kunden' | 'archiv'

/** Reiter in der Reihenfolge der Oberfläche. Nur «kunden» ist ohne das Recht «preise» sichtbar. */
export const PREIS_ANSICHTEN: readonly PreisAnsicht[] = ['liste', 'aenderungen', 'kalkulation', 'regeln', 'kunden', 'archiv']

/** Filter «Handlungsbedarf» über der Preisliste. */
export type PreisHinweis = 'marge' | 'ekAlt' | 'ohneEk' | 'datenblatt' | 'lager'

/** Datenblätter eines Artikels (V87): Link oder abgelegte Datei je Sprache, dazu Familie und Hinweis. */
export interface Datenblaetter {
  de?: string | undefined
  fr?: string | undefined
  en?: string | undefined
  fam?: string | undefined
  hint?: string | undefined
  stand?: string | undefined
}

/** Ein Artikel der Preisliste (Ansicht `preisliste`). EK, Marge, Skonto und Lieferant nur mit Recht «preise». */
export interface Artikel {
  id: string
  artikelnummer: string | null
  name: string
  kategorie: string
  gruppe: string | null
  einheit: string
  leistungW: number | null
  masse: string | null
  masseArt: string | null
  gewichtKg: number | null
  datenblaetter: Datenblaetter
  nachfolgerId: string | null
  archiviertAm: string | null
  archiviertVon: string | null
  archivGrund: string | null
  vkRappen: number | null
  ekRappen: number | null
  marge: number | null
  skonto: number | null
  rabatt: number | null
  lieferant: string | null
  ekStand: string | null
  suchtext: string
  /** Frei im Lager (Bestand minus reserviert), reserviert und bestellt (unterwegs). */
  lagerFrei: number
  lagerReserviert: number
  lagerUnterwegs: number
  /** Anzahl Lieferanten mit Preis (nur mit Recht «preise»). */
  lieferantenAnzahl: number | null
  garantieJahre: number | null
}

/** Preis eines Lieferanten für einen Artikel (V121); der günstigste bestimmt den EK. */
export interface Lieferantenpreis {
  id: string
  lieferantId: string | null
  lieferant: string | null
  artikelnummer: string | null
  ekRappen: number | null
  stand: string | null
}

/** Eine Zeile aus dem Excel «VK Berechnung …» (V89), so wie sie `preise_importieren` erwartet. */
export interface ImportZeile {
  artikelnummer: string
  name: string
  kategorie: string
  hersteller_gruppe: string
  leistung_w: number | null
  ek_rappen: number | null
  marge: number
  skonto: number
  rabatt: number | null
}

/** Position einer Kalkulation. Freie Positionen (Montage, Gerüst …) haben keinen Artikel. */
export interface KalkPosition {
  key: string
  artikelId: string | null
  artikelnummer: string
  name: string
  kategorie: string
  gruppe: string
  wp: number | null
  einheit: string
  menge: number
  ekRappen: number
  marge: number
  skonto: number
  frei?: boolean
  /** Leistung aus «Leistungen & Pauschalen»: ekRappen = Kosten, preisRappen = fester Verkaufspreis. */
  leistung?: string
  /** Fester Preis je Einheit (Leistungen); sonst Preis = EK × (1 + Marge) × (1 + Skonto). */
  preisRappen?: number
  /** Nur in diesen Varianten (leer/fehlt = in allen). */
  varianten?: string[]
  /** Menge folgt einer Regel aus dem Baustein (je Modul, je kWp), «Mengen neu rechnen» setzt sie neu. */
  regel?: MengenRegel
}

/** Mengen-Regel eines Bausteins: fest, je Modul oder je kWp, mal Faktor. */
export interface MengenRegel {
  regel: 'fest' | 'je_modul' | 'je_kwp'
  faktor: number
}

/** Variante einer Kalkulation, z. B. A «Nur PV», B «PV + Speicher». */
export interface Variante {
  id: string
  name: string
}

/** Stand der Freigabe durch die Geschäftsleitung (Rabatt über der Grenze oder Marge zu tief). */
export interface Freigabe {
  status: 'angefragt' | 'freigegeben' | 'abgelehnt'
  hash?: string
  gruende?: string[]
  von?: string
  am?: string
  notiz?: string | null
  entschieden_von?: string
  entschieden_am?: string
  grund?: string | null
}

/** Eine Kalkulation (Preisberechnung): Positionen, Rabatt in Prozent, verknüpfte Offerte. */
export interface Kalkulation {
  id: string | null
  titel: string
  offerteId: string | null
  rabattProzent: number
  notiz: string
  positionen: KalkPosition[]
  geaendertAm?: string | null
  varianten?: Variante[]
  /** Gewählte Variante (für Summen und Offerte). */
  variante?: string | null
  freigabe?: Freigabe | null
}

/** Gespeicherte Vorlage: Artikel mit Mengen, z. B. «Aufdach K2 Systems». */
export interface Preisvorlage {
  id: string
  name: string
  system: string | null
  positionen: { artikelId: string; menge: number }[]
}

/** Marge und Mindestmarge einer Kategorie (Anteile). */
export interface KategorieRegel {
  marge: number
  mindest: number
}

/** Preis-Regeln (Einstellung «preise»). Ohne Recht «preise» kommen nur Förderung und Rundung. */
export interface PreisRegeln {
  kategorien?: Record<string, KategorieRegel>
  skonto?: number
  rundung_rappen?: number
  ek_gueltig_tage?: number
  rabatt_frei_prozent?: number
  mindest_db_prozent?: number
  freigabe_person_ids?: string[]
  foerderung?: {
    name: string
    stand: string
    grund_rappen: number
    je_kwp_rappen: number
    bis_kwp: number
    je_kwp_darueber_rappen: number
  }
  ich_freigeber?: boolean
  freigeber?: { id: string; name: string }[]
}

/** Leistung oder Pauschale (Stundensatz, Anfahrt, Gerüst …). Kosten nur mit Recht «preise». */
export interface Leistung {
  id: string
  schluessel: string
  nameDe: string
  nameFr: string
  einheit: string
  kostenRappen: number | null
  verkaufRappen: number
  bereiche: string[]
  reihenfolge: number
}

/** Zeile eines Bausteins: Leistung, fester Artikel oder Artikel nach Wahl aus einer Kategorie. */
export interface BausteinZeile extends MengenRegel {
  art: 'leistung' | 'artikel' | 'wahl'
  leistung?: string
  artikel_id?: string
  kategorie?: string
}

/** Baustein der Kalkulation, z. B. «PV Aufdach Ziegel» oder «+ Speicher». */
export interface Baustein {
  id: string
  nameDe: string
  nameFr: string
  zeilen: BausteinZeile[]
  reihenfolge: number
}

/** Ergebniszeile einer eingelesenen Preisliste. */
export interface ImportErgebnis {
  i: number
  art: 'geaendert' | 'neu' | 'gleich' | 'fehlt'
  artikel_id?: string
  artikelnummer?: string
  name?: string
  lieferant?: string
  hersteller?: string
  kategorie?: string
  leistung_w?: number
  ek_alt?: number
  ek_neu?: number
  vk_neu?: number
  offerten?: string[]
}

/** Eingelesene Preisliste (Eturnity oder Lieferant), offen bis «Übernehmen» oder «Verwerfen». */
export interface PreisImport {
  id: string
  quelle: string
  dateiname: string | null
  status: 'offen' | 'uebernommen' | 'verworfen'
  ergebnis: ImportErgebnis[]
  zaehlung: Record<string, number>
  erstelltAm: string
  erledigtAm: string | null
  erledigtVon: string | null
  zuordnung: Record<string, string>
}

/** Eintrag im Preisverlauf eines Artikels. */
export interface PreisVerlaufEintrag {
  id: string
  feld: 'ek' | 'marge' | 'skonto'
  alt: number | null
  neu: number | null
  quelle: string
  person: string | null
  lieferant: string | null
  am: string
}
