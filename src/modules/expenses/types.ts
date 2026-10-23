/** Fachliche Typen des Moduls «Spesen». */

/** Eine Spese aus der Sicht `spesen_liste` (mit Person und Beleg-Name). */
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
  status: SpesenStatus
  ausbezahlt_am: string | null
  ausbezahlt_von: string | null
  storniert_am: string | null
  storniert_von: string | null
  storniert_grund: string | null
  erstellt_am: string
}

export type SpesenStatus = 'eingereicht' | 'ausbezahlt' | 'storniert'

/** «Meine» sieht jede Person, «Alle» nur die Buchhaltung (Recht «finanzen»). */
export const ANSICHTEN = ['meine', 'alle', 'kategorien'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

export type SpesenFilter = 'offen' | 'ausbezahlt' | 'storniert' | 'alle'

/** Neue Spese aus dem Formular; der Beleg ist ein Foto oder PDF. */
export interface NeueSpese {
  datum: string
  betrag_rappen: number
  kategorie: string
  zweck: string
  notiz: string | null
  beleg: File | null
}
