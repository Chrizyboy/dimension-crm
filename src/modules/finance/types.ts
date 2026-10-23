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
}

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
}

/** Tranche aus dem Zahlungsplan ohne Rechnung (aus offene_tranchen). */
export interface OffeneTranche {
  id: string
  kunde: string | null
  projekt_nummer: string | null
  bezeichnung: string
  betrag_rappen: number
  faellig_am: string | null
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
}

export type Quelle = 'zahlung' | 'material' | 'fix' | 'rechnung' | 'tranche' | 'eingang'
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

export const REITER = [
  'uebersicht',
  'zahlungen',
  'material',
  'fixkosten',
  'eingaenge',
  'bank',
  'nachkalkulation',
] as const
export type Reiter = (typeof REITER)[number]
