import type { Tables } from '@/types/datenbank'

/** Fachliche Typen des Moduls «Einstellungen». */
export type SettingsId = string & { readonly __brand: 'SettingsId' }

/** Eine Person im Team, so wie die Benutzerverwaltung sie anzeigt. */
export type Person = Pick<
  Tables<'personen'>,
  | 'id'
  | 'kuerzel'
  | 'name'
  | 'email'
  | 'rolle'
  | 'rechte'
  | 'bereiche'
  | 'aktiv'
  | 'sprache'
  | 'standort_id'
  | 'zuletzt_aktiv'
  | 'auth_user_id'
  | 'profil'
>

/** Rolle mit mitgegebenen Rechten und sichtbaren Bereichen (Konfiguration als Daten). */
export type Rolle = Pick<
  Tables<'rollen'>,
  | 'id'
  | 'schluessel'
  | 'name_de'
  | 'name_fr'
  | 'beschreibung_de'
  | 'beschreibung_fr'
  | 'rechte'
  | 'bereiche'
  | 'reihenfolge'
>

export type Standort = Pick<Tables<'standorte'>, 'id' | 'kuerzel' | 'name'>

/** Offene oder angenommene Einladung. */
export type Einladung = Pick<
  Tables<'einladungen'>,
  'id' | 'email' | 'gueltig_bis' | 'verwendet_am' | 'widerrufen_am' | 'erstellt_am'
>

/**
 * Stand einer Person aus Sicht der Administration:
 * aktiv (war schon angemeldet), eingeladen (Mail offen), bereit (erfasst, noch nie angemeldet), deaktiviert.
 */
export type Personenstatus = 'aktiv' | 'eingeladen' | 'bereit' | 'deaktiviert'

/** Antwort der Server-Funktion «einladen». */
export interface Einladungsergebnis {
  ok: boolean
  status?: 'gesendet' | 'hat_konto' | 'mail_fehler'
  fehler?: string
}

/** Ein Dienst, mit dem das CRM verbunden ist (Phase 8). */
export type Dienst = 'microsoft' | 'abaninja' | 'sms' | 'zeitplan'

/** Stand eines Dienstes: letzter Test und nicht geheime Einstellungen. */
export interface Integration {
  dienst: Dienst
  einstellungen: Record<string, unknown>
  zuletzt_geprueft_am: string | null
  zuletzt_ok: boolean | null
  meldung: string | null
}

/** Eine Person und ihre Microsoft-Verbindung. */
export interface MsPerson {
  person_id: string
  name: string
  konto: string | null
  verbunden: boolean | null
  verbunden_am: string | null
  genutzt_am: string | null
  fehler: string | null
}

/** Letzter Lauf eines Hintergrund-Jobs. */
export interface ZeitplanLauf {
  job: string
  zuletzt_am: string | null
  ok: boolean | null
  meldung: string | null
}

/** Ein Aufruf eines fremden Dienstes (nur wann, was, Ergebnis). */
export interface Protokolleintrag {
  id: number
  zeitpunkt: string
  dienst: string
  aktion: string
  ok: boolean
  status: number | null
  dauer_ms: number | null
  meldung: string | null
  person: string | null
}
