/** Fachliche Typen des Moduls «Preise». Beträge in Rappen; Marge, Skonto und Rabatt als Anteil (0.25 = 25 %). */

export type PreisAnsicht = 'liste' | 'archiv' | 'kunden' | 'kalkulation'

/** Reiter in der Reihenfolge der Oberfläche. Nur «kunden» ist ohne das Recht «preise» sichtbar. */
export const PREIS_ANSICHTEN: readonly PreisAnsicht[] = ['liste', 'archiv', 'kunden', 'kalkulation']

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
}

/** Gespeicherte Vorlage: Artikel mit Mengen, z. B. «Aufdach K2 Systems». */
export interface Preisvorlage {
  id: string
  name: string
  system: string | null
  positionen: { artikelId: string; menge: number }[]
}
