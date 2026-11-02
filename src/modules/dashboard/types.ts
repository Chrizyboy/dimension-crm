/** Fachliche Typen des Moduls «Kennzahlen» (V233 Dashboard, ERP-Entscheid 0009). */

/** Zeitraum der Auswertung (V233: Monat, Quartal, Jahr, 12 Monate, alles; neu die laufende Woche). */
export const ZEITRAEUME = ['woche', 'monat', 'quartal', 'jahr', '12m', 'alle'] as const
export type Zeitraum = (typeof ZEITRAEUME)[number]

/** Welche Firma: beide, Muri oder Bulle. */
export const BEREICHE = ['alle', 'muri', 'bulle'] as const
export type Bereich = (typeof BEREICHE)[number]

/** Reiter der Seite; jede Rolle startet in ihrem (siehe `lib/rolle.ts`). */
export const KENNZAHLEN_REITER = [
  'ueberblick',
  'verkauf',
  'pipeline',
  'abwicklung',
  'finanzen',
  'service',
  'alle',
] as const
export type KennzahlenReiter = (typeof KENNZAHLEN_REITER)[number]

/** Womit jede Zahl verglichen wird: gleicher Zeitraum im Vorjahr oder der Zeitraum direkt davor. */
export const VERGLEICHE = ['vorjahr', 'vorperiode'] as const
export type Vergleich = (typeof VERGLEICHE)[number]

/** Eine Detail-Zeile aus `kennzahlen_fakten`: jede Zahl auf der Seite ist eine Menge solcher Zeilen. */
export interface Fakt {
  schluessel: string
  art: 'lead' | 'offerte' | 'projekt' | 'zahlung' | 'fall' | 'rechnung' | 'wartung'
  id: string
  datum: string | null
  standort: string | null
  person_id: string | null
  betrag_rappen: number | null
  quelle: string | null
  name: string | null
  nummer: string | null
  ort: string | null
  stand: string | null
  /** Nur Zusatz-Fakten (`kennzahlen_zusatz`): Leistung, Dauer eines Abschnitts in Tagen, Grund/Produkte/Paket. */
  kwp?: number | null
  tage?: number | null
  zusatz?: string | null
}

/** Ziele eines Jahres in Rappen (Auftragseingang inkl. MWST; Umsatz exkl. MWST); Personen nach id. */
export interface JahresZiel {
  gesamt?: number | null
  muri?: number | null
  bulle?: number | null
  umsatz?: number | null
  personen?: Record<string, number>
}

/** Einstellung «kennzahlen» (ändern über `kennzahlen_einstellungen_setzen`, Recht «finanzen»). */
export interface KennzahlenEinstellungen {
  ziele: Record<string, JahresZiel>
  /** Abschluss-Wahrscheinlichkeit in Prozent je Stand; «alt» gilt für Offerten älter als `alt_tage`. */
  wahrscheinlichkeit: { offeriert: number; nachfassen: number; vertagt: number; alt: number }
  alt_tage: number
  richtwerte: { unterschrift_ibn_tage: number; reaktion_prozent: number; marge_prozent: number }
  quellen_kosten_rappen: Record<string, number>
}

/** Was hinter einer angeklickten Zahl steht. */
export interface Detail {
  titel: string
  fakten: Fakt[]
}

/** Offenes Geschäft für «Pipeline pro Region». */
export interface PipelineZeile {
  id: string
  gruppe: string
  standort: string | null
  kanton: string | null
  wert_rappen: number | null
  kwp: number | null
}

/** Projekt im Auftragsbestand (unterschrieben, noch nicht fertig verrechnet). */
export interface Auftrag {
  id: string
  nummer: string | null
  name: string | null
  standort: string | null
  status: string
  person_id: string | null
  unterzeichnet_am: string | null
  baubeginn: string | null
  vertrag_rappen: number
  verrechnet_rappen: number
  bezahlt_rappen: number
  rest_rappen: number
}

/** Auslastung: Personen und 8 Wochen mit gebuchten und verfügbaren Tagen. */
export interface Auslastung {
  personen: { id: string; name: string; kuerzel: string }[]
  wochen: {
    von: string
    bis: string
    kw: number
    ohne_personen: number
    zellen: { person: string; gebucht: number; abwesend: number; verfuegbar: number }[]
  }[]
}

/** Marge je Projekt aus der Nachkalkulation (nur mit Recht «preise» oder «finanzen»). */
export interface MargeZeile {
  id: string
  nummer: string | null
  name: string | null
  standort: string | null
  status: string
  unterzeichnet_am: string | null
  nachkalkulation: Nachkalkulation | null
}

/** Ausschnitt der Nachkalkulation (Phase 10): Soll aus der Offerte, Ist aus Material, Stunden und Rechnungen. */
export interface Nachkalkulation {
  soll: { verkauf_rappen: number | null; einkauf_rappen: number | null }
  ist: {
    vertrag_rappen: number
    umsatz_rappen: number
    material_rappen: number
    arbeit_rappen: number
    marge_rappen: number
  }
}

/** Antwort von `kennzahlen_betrieb`. */
export interface Betrieb {
  auftragsbestand: Auftrag[]
  auslastung: Auslastung
  marge?: MargeZeile[]
}
