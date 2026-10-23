/** Fachliche Typen des Moduls «KI-Assistent» (Phase 13). */

/** Reiter der Seite (#/ai?ansicht=…). */
export const ANSICHTEN = ['assistent', 'kosten', 'stil', 'einstellungen'] as const
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
