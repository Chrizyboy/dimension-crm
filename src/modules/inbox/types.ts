/** Fachliche Typen des Moduls «Posteingang» (Phase 18). */

/** Arten einer Mail (gleiche Schlüssel wie in der Datenbank und in der KI-Einordnung). */
export const ARTEN = [
  'anfrage',
  'stoerung',
  'kunde',
  'rechnung',
  'lieferant',
  'amt',
  'monitor',
  'sonstiges',
  'intern',
  'werbung',
  'privat',
] as const
export type Art = (typeof ARTEN)[number]

/** Arten mit Antwortfrist in den Einstellungen (die übrigen werden abgelegt oder sind nur zur Kenntnis). */
export const FRIST_ARTEN = [
  'stoerung',
  'anfrage',
  'kunde',
  'rechnung',
  'amt',
  'lieferant',
  'monitor',
  'sonstiges',
] as const

/** neu = noch nicht eingeordnet, offen = Antwort nötig, info = zur Kenntnis, erledigt, abgelegt (Werbung, Intern). */
export type Stand = 'neu' | 'offen' | 'info' | 'erledigt' | 'abgelegt'

/** Reiter der Seite. */
export const REITER = ['eingang', 'auswertung', 'einstellungen'] as const
export type Reiter = (typeof REITER)[number]

/** Filter der Liste. */
export const ANSICHTEN = ['warten', 'neu', 'meine', 'erledigt', 'abgelegt'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Eine Mail im Posteingang, wie die Liste sie lädt. */
export interface Mail {
  id: string
  eingang_am: string
  von_email: string | null
  von_name: string | null
  betreff: string | null
  vorschau: string | null
  web_link: string | null
  hat_anhang: boolean
  postfach: string
  postfach_person_id: string | null
  art: Art | null
  sprache: string | null
  dringend: boolean
  zusammenfassung: string | null
  sortiert: 'offen' | 'regel' | 'ki' | 'ohne_ki' | 'hand'
  stand: Stand
  frist_am: string | null
  eskalation_am: string | null
  erledigt_am: string | null
  erledigt_grund: 'beantwortet' | 'hand' | 'automatisch' | null
  reaktion_minuten: number | null
  zustaendig_id: string | null
  zustaendig: string | null
  vertretung_fuer: string | null
  erledigt_von: string | null
  kontakt: { id: string; name: string; sprache: string } | null
  lead: { id: string; nummer: string } | null
  offerte: { id: string; nummer: string } | null
  projekt: { id: string; nummer: string } | null
  rechnung: { id: string; nummer: string | null } | null
  bestellung: { id: string; nummer: string } | null
  fall: { id: string; nummer: string } | null
}

/** Auswertung der Reaktionszeit (posteingang_auswertung). */
export interface Auswertung {
  wochen: { woche: string; beginn: string; anzahl: number; mitte_min: number | null; in_frist: number }[]
  personen: { person_id: string | null; name: string; anzahl: number; mitte_min: number | null; in_frist: number }[]
}

/** Einstellung «posteingang» (nur Administration ändert sie). */
export interface PosteingangRegeln {
  aktiv?: boolean
  aktiv_seit?: string | null
  arbeitszeit?: { tage?: number[]; von?: string; bis?: string }
  feiertage?: string[]
  vorwarnung_min?: number
  arten?: Partial<Record<Art, { frist_min?: number | null; ablegen?: boolean }>>
  /** Kürzel je Art und Sprache, «standard» für alle anderen. */
  zustaendig?: Partial<Record<Art | 'standard', { de?: string | null; fr?: string | null }>>
  /** Kürzel → Kürzel der Stellvertretung bei Abwesenheit (Outlook «abwesend»). */
  vertretung?: Record<string, string>
  /** Kürzel, die bei doppelter Frist die Glocke bekommen; leer = Administration. */
  eskalation?: string[]
}

/** Person zur Auswahl (Zuständig, Weitergeben). */
export interface Person {
  id: string
  kuerzel: string
  name: string
}
