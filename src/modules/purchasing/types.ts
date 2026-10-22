/** Fachliche Typen des Moduls «Einkauf & Material». */

/** Reiter der Seite (#/purchasing?reiter=…). */
export const REITER = ['bestellungen', 'material', 'lager', 'lieferanten'] as const
export type Reiter = (typeof REITER)[number]

export const BESTELL_FILTER = ['offen', 'entwuerfe', 'ueberfaellig', 'geliefert', 'alle'] as const
export type BestellFilter = (typeof BESTELL_FILTER)[number]

export type BestellStatus = 'entwurf' | 'freigegeben' | 'bestellt' | 'teilgeliefert' | 'geliefert' | 'storniert'

/** Eine Bestellung aus der Sicht «bestellungen_liste». */
export interface Bestellung {
  id: string
  nummer: string
  status: BestellStatus
  lieferant_id: string
  lieferant: string
  email_bestellung: string | null
  lieferant_sprache: 'de' | 'fr'
  kundennummer_bei_lieferant: string | null
  projekt_id: string | null
  projekt_nummer: string | null
  projekt_titel: string | null
  kunde: string | null
  objekt_strasse: string | null
  objekt_plz: string | null
  objekt_ort: string | null
  lagerort_id: string | null
  lagerort: string | null
  lagerort_adresse: string | null
  liefertermin: string | null
  bestellt_am: string | null
  geliefert_am: string | null
  freigegeben_am: string | null
  freigegeben_von: string | null
  total_rappen: number | null
  notiz: string | null
  storniert_grund: string | null
  positionen: number
  menge_total: number
  menge_geliefert: number
  ueberfaellig: boolean
  mail_status: string | null
  erstellt_am: string
  firma: string | null
  firma_strasse: string | null
  firma_plz: string | null
  firma_ort: string | null
}

/** Position einer Bestellung. */
export interface Position {
  id: string
  bestellung_id: string
  artikel_id: string | null
  projekt_material_id: string | null
  bezeichnung: string
  artikelnummer: string | null
  menge: number
  einheit: string
  ek_rappen: number | null
  geliefert_menge: number
  reihenfolge: number
}

/** Zeile der Materialliste eines Projekts mit Deckung (Sicht «projekt_material_stand»). */
export interface MaterialZeile {
  id: string
  projekt_id: string
  artikel_id: string | null
  artikelnummer: string | null
  kategorie: string | null
  bezeichnung: string
  menge: number
  einheit: string
  quelle: 'kalkulation' | 'offerte' | 'hand'
  reserviert: number
  entnommen: number
  unterwegs: number
  direkt_geliefert: number
  vorhanden: number
  fehlt: number
  frei_im_lager: number
  notiz: string | null
}

/** Projekt in der Übersicht «Material je Projekt». */
export interface MaterialProjekt {
  id: string
  nummer: string
  titel: string | null
  kunde: string
  ort: string | null
  status: string
  baubeginn: string | null
  material_status: string | null
}

/** Bestand eines Artikels an einem Lagerort (Sicht «lager_uebersicht»). */
export interface LagerZeile {
  id: string
  lagerort_id: string
  lagerort: string
  artikel_id: string
  artikel: string
  artikelnummer: string | null
  kategorie: string
  einheit: string
  menge: number
  reserviert: number
  frei: number
  mindestmenge: number | null
  unterwegs: number
  unter_mindest: boolean
}

export interface Lieferant {
  id: string
  name: string
  email_bestellung: string | null
  kundennummer_bei_lieferant: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  aktiv: boolean
  notiz: string | null
}

export interface Lagerort {
  id: string
  name: string
  adresse: string | null
}

/** Artikel aus der Preisliste für Auswahl und Bestellung. */
export interface ArtikelTreffer {
  id: string
  name: string
  artikelnummer: string | null
  einheit: string
}

export type LagerArt = 'eingang' | 'korrektur' | 'inventur' | 'reservierung' | 'freigabe' | 'entnahme'
