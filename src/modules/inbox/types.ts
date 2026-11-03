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

/** Reiter der Seite: Arbeitsplatz, Team-Übersicht, Absender-Regeln, Reaktionszeit, Einstellungen (Administration). */
export const REITER = ['eingang', 'team', 'regeln', 'auswertung', 'einstellungen'] as const
export type Reiter = (typeof REITER)[number]

/**
 * Ansichten links im Arbeitsplatz. meine = «Für mich» (Standard), verteilen = info@ noch nicht weitergegeben (nur wer
 * verteilt), warten = alle offenen im Team («Wartet auf uns»), kunde = wir warten auf den Kunden, zurueck =
 * zurückgestellt, aeltere = Archiv vor den letzten 14 Tagen mit Suche (eigens vom Server geladen).
 */
export const ANSICHTEN = [
  'meine',
  'verteilen',
  'warten',
  'kunde',
  'zurueck',
  'erledigt',
  'abgelegt',
  'aeltere',
] as const
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
  erledigt_grund: 'beantwortet' | 'hand' | 'automatisch' | 'archiv' | null
  reaktion_minuten: number | null
  zustaendig_id: string | null
  zustaendig: string | null
  /** zurückgestellt bis (Wiedervorlage) */
  zurueck_am: string | null
  /** wir warten auf den Kunden bis */
  warten_bis: string | null
  /** kam zurück, weil der Kunde nicht geantwortet hat */
  nachfassen: boolean
  /** Team-Postfach: schon weitergegeben */
  verteilt_am: string | null
  vorschlag_id: string | null
  vorschlag: string | null
  /** von der KI gelesen: betrag_rappen, faellig, rechnungsdatum, rechnungsnummer, liefertermin, firma */
  ki_werte: KiWerte
  zahlung_id: string | null
  konversation_id: string | null
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

/** Werte, die die KI aus einer Rechnung oder Auftragsbestätigung gelesen hat (zum Prüfen, nie automatisch). */
export interface KiWerte {
  betrag_rappen?: number
  faellig?: string
  rechnungsdatum?: string
  rechnungsnummer?: string
  liefertermin?: string
  firma?: string
}

/** Eine Mail der Unterhaltung (aus Outlook). */
export interface VerlaufMail {
  id: string
  von: string
  von_name: string
  zeit: string
  wir: boolean
  text: string
}

/** Anhang einer Mail (aus Outlook). */
export interface Anhang {
  id: string
  name: string
  groesse: number
  typ: string
}

/** Interne Notiz zu einer Mail. */
export interface Notiz {
  id: string
  person: string
  kuerzel: string
  text: string
  am: string
}

/** Absender-Regel. postfach_person_id leer = Team-Postfächer (info@). */
export interface AbsenderRegel {
  id: string
  postfach_person_id: string | null
  absender: string
  aktion: 'ablegen' | 'zuweisen' | 'art'
  person_id: string | null
  art: Art | null
}

/** Zahlen einer Person für die Team-Übersicht (keine Inhalte). */
export interface TeamZeile {
  person_id: string
  name: string
  kuerzel: string
  offen: number
  ueber: number
  zurueck: number
  warten: number
  mitte_min: number | null
  abwesend: boolean
  vertretung: string | null
}

/** Offene Bestellung zur Auswahl (Liefertermin aus Auftragsbestätigung). */
export interface OffeneBestellung {
  id: string
  nummer: string
  lieferant: string
  liefertermin: string | null
  status: string
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
  /** Kürzel, die Mails aus Team-Postfächern verteilen (die erste anwesende ist zuständig). */
  verteilen?: string[]
  /** Alte Liste je Art und Sprache; gilt nur noch, wenn niemand verteilt. */
  zustaendig?: Partial<Record<Art | 'standard', { de?: string | null; fr?: string | null }>>
  /** Kürzel → Kürzel der Stellvertretung bei Abwesenheit (Outlook «abwesend»). */
  vertretung?: Record<string, string>
  /** Kürzel, die bei doppelter Frist die Glocke bekommen; leer = Administration. */
  eskalation?: string[]
  /** Wie viele Monate ältere Mails nachgeholt werden (0 = keine). */
  nachholen_monate?: number
  /** Warten auf Kunde: automatisch nach Antwort (Arten, Mails mit Offerte), Arbeitstage, Frist beim Nachfassen. */
  warten?: { auto?: boolean; tage?: number; arten?: string[]; mit_offerte?: boolean; frist_min?: number }
  /** Vorschlag beim Verteilen je Art (Kürzel), wenn die Akte niemanden nennt. */
  vorschlag?: Partial<Record<Art, string>>
}

/** Stand des Nachholens je Postfach und Ordner (posteingang_nachholen_uebersicht). */
export interface NachholenStand {
  postfach: string
  ordner: 'inbox' | 'sentitems'
  bis: string
  anzahl: number
  fertig: boolean
}

/** Person zur Auswahl (Zuständig, Weitergeben). */
export interface Person {
  id: string
  kuerzel: string
  name: string
}
