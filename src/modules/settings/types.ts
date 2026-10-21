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
