/** Fachliche Typen des Moduls «Einkauf & Material». */

/** Reiter der Seite (#/purchasing?reiter=…). */
export const REITER = ['leitstand', 'material', 'bestellen', 'bestellungen', 'lager', 'lieferanten'] as const
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
  /** Auftragsbestätigung des Lieferanten erhalten (stoppt die Nachfrage). */
  bestaetigt_am: string | null
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
  // Entscheid 0041
  erwartet_am: string | null
  baubeginn: string | null
  ab_nummer: string | null
  ab_am: string | null
  ab_termin: string | null
  ab_total_rappen: number | null
  tracking: string | null
  lieferhinweis: string | null
  kontakt_vor_ort: string | null
  nachgefragt_am: string | null
  lieferscheine: string[]
  vorgelegt_am: string | null
  bestellt_von: string | null
  bestellt_von_name: string | null
  rechnung_kreditor_id: string | null
  rechnung_nummer: string | null
  rechnung_rappen: number | null
  rechnung_geprueft_am: string | null
  rechnung_geprueft_von: string | null
  rechnung_notiz: string | null
  schritt: Schritt
  gefaehrdet: boolean
  projekte: string | null
  fracht_frei_ab_rappen: number | null
  fracht_rappen: number | null
  mindestbestellwert_rappen: number | null
  bestellweg: Bestellweg
  webshop_url: string | null
}

/** Schritt einer Bestellung im Leitstand (berechnet die Sicht «bestellungen_liste»). */
export const SCHRITTE = ['freigabe', 'ab_offen', 'unterwegs', 'eingang', 'rechnung', 'fertig'] as const
export type Schritt = (typeof SCHRITTE)[number] | 'storniert'

export type Bestellweg = 'mail' | 'webshop' | 'telefon'

/** Offener Bedarf zum Bestellen (Sicht «einkauf_bedarf»): Projekt-Material oder Lager unter Mindestmenge. */
export interface Bedarf {
  quelle: 'projekt' | 'lager'
  projekt_id: string | null
  material_id: string | null
  artikel_id: string | null
  bezeichnung: string
  einheit: string
  fehlt: number
  aus_lager: number
  lagerort_id: string | null
  projekt_nummer: string | null
  kunde: string | null
  baubeginn: string | null
  artikelnummer: string | null
  lieferant_id: string | null
  lieferant: string | null
  ek_rappen: number | null
  verpackungseinheit: number | null
  lieferzeit_tage: number | null
  bestellen_bis: string | null
}

/** Projekt im Materialplan (Sicht «materialplan»). */
export interface PlanZeile {
  id: string
  nummer: string
  titel: string | null
  status: string
  baubeginn: string | null
  material_status: string | null
  kunde: string
  ort: string | null
  zeilen: number
  zeilen_da: number
  zeilen_fehlt: number
  zeilen_unterwegs: number
  deckung_prozent: number
  erwartet_spaetestens: string | null
  ueberfaellig: boolean
  bestellen_bis: string | null
  gefaehrdet: boolean
}

/** Kennzahlen eines Lieferanten (Sicht «lieferanten_kennzahlen»). */
export interface LieferantKennzahl {
  id: string
  einkauf_jahr_rappen: number
  bestellungen_jahr: number
  puenktlich_prozent: number | null
  lieferzeit_schnitt_tage: number | null
  offen: number
  artikel_mit_preis: number
}

/** Vorgeschlagene Lieferantenrechnung aus AbaNinja. */
export interface RechnungVorschlag {
  id: string
  rechnung_nr: string | null
  rechnung_am: string | null
  betrag_rappen: number | null
  status: string | null
  text: string | null
  erwartet_rappen: number
}

/** Mail im Posteingang zu einer Bestellung. */
export interface BestellMail {
  id: string
  eingang_am: string
  von_name: string | null
  von_email: string | null
  betreff: string | null
  vorschau: string | null
  hat_anhang: boolean
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
  ab_menge?: number | null
  ab_ek_rappen?: number | null
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
  lagerplatz: string | null
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
  fracht_frei_ab_rappen: number | null
  fracht_rappen: number | null
  mindestbestellwert_rappen: number | null
  lieferzeit_tage: number | null
  zahlungsziel_tage: number | null
  skonto_prozent: number | null
  skonto_tage: number | null
  bestellschluss: string | null
  bestellweg: Bestellweg
  webshop_url: string | null
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

export type LagerArt = 'eingang' | 'korrektur' | 'inventur' | 'reservierung' | 'freigabe' | 'entnahme' | 'rueckgabe'
