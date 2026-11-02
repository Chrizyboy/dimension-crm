/** Fachliche Typen des Moduls «Finanzen» (Liquidität, Zahlungen, Material, Fixkosten, Eingänge, Bank). */

export const PRIORITAETEN = ['normal', 'wichtig', 'mahnung', 'betreibung'] as const
export type Prioritaet = (typeof PRIORITAETEN)[number]

export const WAHRSCHEINLICHKEITEN = ['sicher', 'wahrscheinlich', 'unsicher', 'aus'] as const
export type Wahrscheinlichkeit = (typeof WAHRSCHEINLICHKEITEN)[number]

/** Kategorien der Zahlungen wie in V233 (Filter und Auswertung). */
export const ZAHLUNG_KATEGORIEN = [
  'Lieferant',
  'Material',
  'Subunternehmer',
  'Sozialversicherung',
  'Steuern',
  'Leasing',
  'Fahrzeuge',
  'Versicherung',
  'Miete',
  'Lohn',
  'Telecom',
  'Marketing',
  'Messe',
  'Kreditkarte',
  'Sonstiges',
] as const

export const FIX_GRUPPEN = [
  'Löhne',
  'Sozialversicherung',
  'Miete',
  'Leasing',
  'Versicherung',
  'Telecom',
  'Software',
  'Sonstiges',
] as const
export const MATERIAL_POSITIONEN = [
  'UK K2',
  'Module',
  'WR + Z',
  'Batterie',
  'Kabel / Kleinmaterial',
  'Sonstiges',
] as const

/** Zahlung an Lieferanten, Ämter usw. (Tabelle kreditor_zahlungen), auch Lieferantenrechnungen aus AbaNinja. */
export interface Zahlung {
  id: string
  firma: string | null
  text: string | null
  kategorie: string | null
  rechnung_nr: string | null
  rechnung_am: string | null
  betrag_rappen: number | null
  faellig_am: string | null
  geplant_am: string | null
  prioritaet: string | null
  status: string
  geprueft: boolean
  fixkosten_id: string | null
  monat: string | null
  notiz: string | null
  quelle: string | null
  abaninja_uuid: string | null
  projekt_id: string | null
  lieferant_id: string | null
  offen_rappen: number | null
  bezahlt_am: string | null
  firma_id: string | null
  pruefung: Pruefung | null
  visum_von: string | null
  visum_am: string | null
  visum_notiz: string | null
  freigabe_von: string | null
  freigabe_am: string | null
  skonto_prozent: number | null
  skonto_bis: string | null
  skonto_rappen: number | null
  iban: string | null
  referenz: string | null
  bestellung_id: string | null
  zahllauf_id: string | null
}

/** Prüfschritt einer Lieferantenrechnung: Visum Projektleitung → Freigabe Buchhaltung → zahlbereit. */
export const PRUEFUNGEN = ['visum', 'freigabe', 'bereit', 'klaeren', 'zurueckgehalten'] as const
export type Pruefung = (typeof PRUEFUNGEN)[number]

/** Eine Material-Position einer Baustelle. Beträge in Franken (wie aus V233 übernommen), MWST je Position. */
export interface MaterialPosition {
  position: string
  lieferant?: string
  ek: number | string
  transport?: number | string
  exkl?: boolean
  status: 'offen' | 'bezahlt'
  bezahltAm?: string
  geplantAm?: string
}

/** Material-Zahlungen je Baustelle (Tabelle material_zahlungen). */
export interface Material {
  id: string
  firma_id: string | null
  baustelle: string | null
  projekt_id: string | null
  bautermin: string | null
  geplant_am: string | null
  zahlbar_bis: string | null
  positionen: MaterialPosition[]
  archiviert: boolean
  notiz: string | null
}

/** Wiederkehrende Kosten (Tabelle fixkosten). */
export interface Fixkosten {
  id: string
  firma_id: string | null
  bezeichnung: string | null
  gruppe: string | null
  detail: string | null
  betrag_rappen: number | null
  rhythmus: string | null
  tag: number | null
  start_monat: string | null
  ab: string | null
  bis: string | null
  standort: string | null
  aktiv: boolean
  notiz: string | null
}

/** Von Hand erwarteter Zahlungseingang (Tabelle erwartete_eingaenge). */
export interface Eingang {
  id: string
  firma_id: string | null
  kunde: string | null
  projekt_id: string | null
  text: string | null
  betrag_rappen: number | null
  erwartet_am: string | null
  eingang_am: string | null
  wahrscheinlichkeit: string | null
  status: string
  geprueft: boolean
  quelle: string | null
}

/** Offene Kundenrechnung (aus rechnungen_liste). */
export interface OffeneRechnung {
  id: string
  nummer: string | null
  kunde: string
  projekt_nummer: string | null
  titel: string
  offen_rappen: number
  faellig_am: string | null
  firma_id: string | null
  projekt_id: string | null
}

/** Tranche aus dem Zahlungsplan ohne Rechnung (aus offene_tranchen). */
export interface OffeneTranche {
  id: string
  kunde: string | null
  projekt_nummer: string | null
  bezeichnung: string
  betrag_rappen: number
  faellig_am: string | null
  projekt_id: string | null
}

/** Eingetragener Kontostand. Ältere Einträge aus V233 haben `betrag` in Franken. */
export interface Kontostand {
  betrag_rappen?: number
  betrag?: number
  datum: string
  konto?: string
  at?: string
  by?: string
}

/** Einstellungen der Liquidität (finanz_einstellungen «vorlage.main»). */
export interface LiquiditaetEinstellungen {
  saldo?: Kontostand | null
  saldoHist?: Kontostand[]
  wochen?: number
  vorlauf?: number
  reserve_rappen?: number
  /** Reserve je Gesellschaft (firma_id → Rappen). */
  reserve_je_firma?: Record<string, number>
  mwst?: number
  /** Angepasste Wahrscheinlichkeit oder Datum je Eingang aus dem CRM («rechnung:<id>», «tranche:<id>»). */
  ov?: Record<string, { prob?: Wahrscheinlichkeit; date?: string }>
}

/** Alles, was die Vorschau braucht. */
export interface Finanzdaten {
  zahlungen: Zahlung[]
  material: Material[]
  fixkosten: Fixkosten[]
  eingaenge: Eingang[]
  rechnungen: OffeneRechnung[]
  tranchen: OffeneTranche[]
  /** Kundenzahlungen nach dem Datum des Kontostands (für den rechnerischen Saldo). */
  kundenzahlungen: { datum: string; betrag_rappen: number }[]
  einstellungen: LiquiditaetEinstellungen
  /** Bankkonten mit Stand; leer = alter, von Hand eingetragener Kontostand. */
  konten: Konto[]
  firmen: Firma[]
  /** Gesellschaft je Projekt (für Tranchen). */
  projektFirma: Record<string, string>
  /** Geschätzte oder verbindliche MWST je Gesellschaft und Periode. */
  mwst: MwstZeile[]
  zahllaeufe: Zahllauf[]
  /** Bestellungen, auf die Lieferantenrechnungen zeigen (Vergleich Betrag). */
  bestellungen: Record<string, { nummer: string; total_rappen: number | null; bestellt_am: string | null }>
  /** Namen der Personen (Visum, Freigabe). */
  personen: Record<string, string>
}

export interface Firma {
  id: string
  kuerzel: string
  name: string
}

/** Bankkonto einer Gesellschaft (Tabelle finanz_konten). */
export interface Konto {
  id: string
  firma_id: string
  name: string
  iban: string | null
  stand_rappen: number | null
  stand_am: string | null
  reihenfolge: number
  aktiv: boolean
  notiz: string | null
}

/** Zeile aus mwst_schaetzung(). */
export interface MwstZeile {
  firma_id: string
  periode: string
  von: string
  bis: string
  faellig_am: string
  umsatz_rappen: number
  umsatzsteuer_rappen: number
  vorsteuer_rappen: number
  zahllast_rappen: number
  verbindlich: boolean
  bezahlt_am: string | null
}

export const ZAHLLAUF_STATUS = ['zur_freigabe', 'freigegeben', 'erledigt', 'verworfen'] as const

/** Zahllauf einer Gesellschaft (Tabelle zahllaeufe). */
export interface Zahllauf {
  id: string
  firma_id: string
  konto_id: string | null
  ausfuehren_am: string
  status: (typeof ZAHLLAUF_STATUS)[number]
  vorbereitet_von: string | null
  freigegeben_von: string | null
  freigegeben_am: string | null
  erledigt_am: string | null
  erstellt_am: string
  notiz: string | null
}

export type Quelle = 'zahlung' | 'material' | 'fix' | 'rechnung' | 'tranche' | 'eingang' | 'mwst'
export type Szenario = 'real' | 'pess' | 'opt'

/** Eine erwartete Bewegung auf dem Konto: Ausgang (−1) oder Eingang (+1). */
export interface Bewegung {
  richtung: 1 | -1
  rappen: number
  datum: string | null
  titel: string
  zusatz: string
  quelle: Quelle
  id: string
  /** Material: Index der Position; Fixkosten: Monat «2026-10». */
  idx?: number
  monat?: string
  kategorie: string
  prioritaet: Prioritaet
  wahrscheinlichkeit: Wahrscheinlichkeit
  faellig: string | null
  geplant: boolean
  spaet: boolean
  lohn: boolean
}

export interface Woche {
  i: number
  von: string
  bis: string
  kw: number
  ein: number
  aus: number
  start: number
  ende: number
  bewegungen: Bewegung[]
}

export const REITER = ['cockpit', 'lieferanten', 'zahllauf', 'liquiditaet', 'marge', 'abschluss'] as const
export type Reiter = (typeof REITER)[number]

/** Frühere Reiter-Adressen (Lesezeichen, Glocke) auf die neuen Reiter. */
export const ALTE_REITER: Record<string, Reiter> = {
  uebersicht: 'cockpit',
  zahlungen: 'lieferanten',
  material: 'liquiditaet',
  fixkosten: 'liquiditaet',
  eingaenge: 'liquiditaet',
  bank: 'abschluss',
  nachkalkulation: 'marge',
}

/** Unterteile der Liquidität. */
export const LIQ_TEILE = ['wochen', 'material', 'fixkosten', 'eingaenge'] as const
export type LiqTeil = (typeof LIQ_TEILE)[number]
