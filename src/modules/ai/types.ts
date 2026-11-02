/** Fachliche Typen des Moduls «KI-Assistent» (Phase 13). */

/** Reiter der Seite (#/ai?ansicht=…). «assistent» ist der alte Name von «fragen» (Links bleiben gültig). */
export const ANSICHTEN = [
  'fragen',
  'auftraege',
  'dokument',
  'verlauf',
  'im_crm',
  'kosten',
  'stil',
  'einstellungen',
  'assistent',
] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Modell-Stufe einer Funktion: «standard» für Texte und Urteile, «schnell» fürs Lesen und Einordnen. */
export type Stufe = 'standard' | 'schnell'

/** Einstellung «ki» (nur Administration). Kosten in Rappen, Preise in USD pro Million Tokens. */
export interface KiEinstellungen {
  aktiv: boolean
  modelle: Record<Stufe, string>
  preise_usd: Record<string, { ein: number; aus: number; cache_lesen: number; cache_schreiben: number }>
  usd_chf: number
  tageslimit_rappen: number
  person_limit_rappen: number | null
  funktionen: Record<string, Stufe>
  /** Ausgeschaltete Funktionen (Reiter «Im CRM»). */
  aus?: string[]
  stil: { de: string; fr: string }
}

/** Kostenübersicht eines Zeitraums (Tausendstel-Rappen). */
export interface KiKosten {
  summe_millirappen: number
  anzahl: number
  fehler: number
  tage: { tag: string; anzahl: number; millirappen: number }[]
  funktionen: { funktion: string; anzahl: number; millirappen: number }[]
  personen: { person_id: string; name: string; anzahl: number; millirappen: number }[]
  modelle: { modell: string; anzahl: number; eingabe: number; ausgabe: number; millirappen: number }[]
}

/** Persönlicher Schreibstil: gelernte Regeln und die letzten Beispiele (ohne Namen). */
export interface Schreibstil {
  id: string
  regeln: string[]
  beispiele: { art: string | null; text: string; am: string }[]
  anzahl: number
}

/** Tagesbriefing (Bau-Auftrag 3.4, «Heute»). `ref` zeigt auf einen Datensatz, z. B. «lead:<id>». */
export interface Briefing {
  gruss: string
  einleitung: string
  prioritaeten: { titel: string; warum: string; ref: string | null }[]
  hinweis: string | null
}

/** Vorschlag unter einer Antwort; übernommen wird erst nach dem Klick. */
export interface Vorschlag {
  art: 'aufgabe' | 'mail' | 'oeffnen'
  titel: string
  begruendung: string
  tabelle: string | null
  id: string | null
  faellig_am: string | null
  kundenart: string | null
  wunsch: string | null
}

/** Eine Runde im Gespräch: Frage, Antwort, Tabelle aus den gelesenen Daten, Vorschläge. */
export interface Runde {
  frage: string
  antwort: string
  tabelle: { tabelle: string; spalten: string[]; zeilen: Record<string, unknown>[]; mehr: boolean } | null
  vorschlaege: Vorschlag[]
  quellen: string[]
  am: string
  dokument?: DokumentInhalt
}

export interface Gespraech {
  id: string
  art: 'frage' | 'dokument'
  titel: string
  bezug_tabelle: string | null
  bezug_id: string | null
  nachrichten: Runde[]
}

export interface GespraechKurz {
  id: string
  art: 'frage' | 'dokument'
  titel: string
  bezug_tabelle: string | null
  bezug_id: string | null
  kosten_millirappen: number
  geaendert_am: string
  runden: number
  vorschlaege: number
}

/** Was der Assistent aus einem Dokument liest. */
export interface DokumentInhalt {
  art: string
  titel: string
  zusammenfassung: string
  felder: { name: string; wert: string; sicher: boolean }[]
  absender: string | null
  kunde: string | null
  naechster_schritt: string
}

export interface DokumentErgebnis {
  gespraech_id: string
  dokument: DokumentInhalt
  treffer: { tabelle: string; id: string; titel: string }[]
  kosten_millirappen: number
}

/** Auftrag (Vorlage): «frage» geht als Frage ans CRM, «text» öffnet das Schreibfenster. */
export interface Vorlage {
  id: string
  person_id: string | null
  art: 'frage' | 'text'
  titel_de: string
  titel_fr: string
  text_de: string
  text_fr: string
  auftrag: string
  kundenart: string | null
  rollen: string[]
  reihenfolge: number
}

export interface VorlageEingabe {
  person_id: string | null
  art: 'frage' | 'text'
  titel: string
  titel_fr?: string
  text: string
  auftrag: string
  kundenart: string | null
  rollen: string[]
}
