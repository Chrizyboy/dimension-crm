/** Fachliche Typen des Moduls «Spesen». */

/** Stand einer Spese: eingereicht → (Rückfrage →) geprüft → ausbezahlt; oder abgelehnt/storniert. */
export type SpesenStatus = 'eingereicht' | 'rueckfrage' | 'geprueft' | 'abgelehnt' | 'ausbezahlt' | 'storniert'

/** Hinweise für die Prüfung, gerechnet von der Datenbank (Sicht `spesen_liste`). */
export type SpesenHinweis = 'doppelt' | 'ohne_beleg' | 'alt' | 'richtwert' | 'waehrung'

/** Ein Eintrag im Verlauf der Spese (wer hat wann was getan). */
export interface SpesenEintrag {
  am: string
  von: string | null
  text: string
}

/** Eine Spese aus der Sicht `spesen_liste` (mit Person, Projekt, Konto, Beleg und Hinweisen). */
export interface Spese {
  id: string
  person_id: string
  person: string | null
  kuerzel: string | null
  datum: string
  betrag_rappen: number
  kategorie: string
  zweck: string | null
  notiz: string | null
  beleg_id: string | null
  beleg_name: string | null
  beleg_typ: string | null
  status: SpesenStatus
  art: 'beleg' | 'kilometer'
  bezahlt_mit: 'eigen' | 'firmenkarte'
  projekt_id: string | null
  projekt_nummer: string | null
  projekt_titel: string | null
  mwst_satz: number | null
  mwst_rappen: number | null
  km: number | null
  km_satz_rappen: number | null
  strecke: string | null
  personen: number | null
  waehrung: string
  konto: string | null
  hinweise: SpesenHinweis[]
  geprueft_am: string | null
  geprueft_von: string | null
  rueckfrage: string | null
  rueckfrage_am: string | null
  abgelehnt_grund: string | null
  ausbezahlt_am: string | null
  ausbezahlt_von: string | null
  ausbezahlt_mit: 'lohn' | 'ueberweisung' | null
  auszahlung_id: string | null
  storniert_am: string | null
  storniert_von: string | null
  storniert_grund: string | null
  verlauf: SpesenEintrag[]
  erstellt_am: string
}

/** Auszahlungslauf (nur Buchhaltung). */
export interface Auszahlung {
  id: string
  datum: string
  art: 'lohn' | 'ueberweisung'
  titel: string
  total_rappen: number
  anzahl: number
  personen: number
  erstellt_am: string
}

/** Projekt zur Auswahl beim Erfassen. */
export interface SpesenProjekt {
  id: string
  nummer: string
  titel: string | null
}

/**
 * «Meine» sieht jede Person; «Prüfen», «Auszahlen», «Alle», «Auswertung» und «Regeln» nur die Buchhaltung
 * (Recht «finanzen»). «kategorien» bleibt als Adresse gültig und zeigt die Regeln.
 */
export const ANSICHTEN = ['meine', 'pruefen', 'auszahlen', 'karte', 'alle', 'auswertung', 'kategorien'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

export type SpesenFilter = 'offen' | 'ausbezahlt' | 'firmenkarte' | 'abgelehnt' | 'alle'

/** Neue oder geänderte Spese aus dem Formular; der Beleg ist ein Foto oder PDF. */
export interface NeueSpese {
  art: 'beleg' | 'kilometer'
  datum: string
  betrag_rappen: number
  kategorie: string
  zweck: string
  notiz: string | null
  projekt_id: string | null
  bezahlt_mit: 'eigen' | 'firmenkarte'
  mwst_satz: number | null
  mwst_rappen: number | null
  personen: number | null
  km: number | null
  strecke: string | null
  beleg: File | null
}
