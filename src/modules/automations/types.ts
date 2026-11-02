import type { Zweisprachig } from '@/types/modul'

/** «freigabe»: was nach aussen geht, wartet im Ausgangskorb; «automatisch»: geht ohne Klick (Regel 6). */
export type Modus = 'freigabe' | 'automatisch'

/** Vergleich in einer Bedingung; «leer»/«nicht_leer» brauchen keinen Wert, «in» eine Liste. */
export type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'enthaelt' | 'in' | 'leer' | 'nicht_leer'

export type Wert = string | number | boolean | null | (string | number)[]

/** Eine Bedingung, z. B. «lead.kanton = FR». Das Feld ist ein Pfad im Kontext des Laufs. */
export interface Bedingung {
  feld: string
  op: Operator
  wert?: Wert
}

/** Arten von Aktionen, wie sie die Datenbank kennt (automation_katalog). */
export type AktionsArt =
  | 'aufgabe'
  | 'benachrichtigung'
  | 'mail'
  | 'sms'
  | 'warten'
  | 'pruefen'
  | 'dubletten'
  | 'zuteilen'
  | 'rechnung_entwurf'
  | 'zahlungserinnerung'
  | 'zielgruppe'
  | 'outlook_termin'
  | 'sharepoint_ordner'
  | 'abaninja_kunde'
  | 'wiedervorlage'
  | 'notiz'

/** Eine Aktion; welche Felder zählen, hängt von der Art ab (siehe AktionFelder). */
export interface Aktion {
  art: AktionsArt
  /** Empfänger: erster Eintrag, der jemanden findet («zustaendig», «rolle:verkauf», «person:<id>» …). */
  an?: string[]
  absender?: string[]
  titel?: Zweisprachig
  text?: Zweisprachig
  betreff?: Zweisprachig
  faellig_tage?: number
  stufe?: 'info' | 'ok' | 'warnung' | 'kritisch'
  tage?: number
  bedingungen?: Bedingung[]
  /** SMS: «vortag_termin» = am Vortag des Termins. */
  sende?: 'vortag_termin'
  werbung?: boolean
  tranche?: 'erste' | 'letzte'
  merkmal?: string
  /** Mail: die KI schreibt den Text im Stil der Firma (Art des Kundentexts); der Text oben ist die Vorlage. */
  ki?: string
  ki_wunsch?: string
  /** Warten/Wiedervorlage: Arbeitstage statt Kalendertage (ohne Wochenende und Feiertage). */
  arbeitstage?: boolean
  /** Prüfen: nicht erfüllt → «ende» (Standard) oder nur den nächsten Schritt überspringen. */
  sonst?: 'ende' | 'ueberspringen'
  /** Mail/SMS ohne Adresse: stattdessen eine Anruf-Aufgabe an die absendende Person. */
  ersatz_aufgabe?: boolean
}

/** Wann Nachrichten an Kunden gehen dürfen (ISO-Wochentage 1 = Montag). */
export interface Versandfenster {
  tage?: number[]
  von?: string
  bis?: string
  immer?: boolean
}

/** Eine Automation: Auslöser → Bedingungen → Aktionen. */
export interface Automation {
  id: string
  vorlage: string | null
  name_de: string
  name_fr: string
  beschreibung_de: string | null
  beschreibung_fr: string | null
  aktiv: boolean
  aktiv_seit: string | null
  modus: Modus
  ausloeser: string
  bedingungen: Bedingung[]
  aktionen: Aktion[]
  reihenfolge: number
  /** null = Standard aus den Einstellungen. */
  versandfenster: Versandfenster | null
  kontakt_pause_tage: number | null
}

/** Was die Datenbank an Bausteinen anbietet (automation_katalog). */
export interface Katalog {
  ereignisse: { schluessel: string; tabelle: string | null; art: 'sofort' | 'zeit' }[]
  felder: Record<string, string[]>
  aktionen: { art: AktionsArt; nach_aussen: boolean; server?: boolean }[]
  empfaenger: string[]
  platzhalter: string[]
  operatoren: Operator[]
  zielgruppen: string[]
}

export type LaufStand =
  'laeuft' | 'wartet' | 'server' | 'fertig' | 'uebersprungen' | 'fehler' | 'abgebrochen' | 'gestoppt'

/** Ein Eintrag im Protokoll eines Laufs. «meldung» ist ein Schlüssel (automationen.meldung.*) oder ein Fehlertext. */
export interface ProtokollEintrag {
  nr: number
  art: string
  zeit: string
  ergebnis: 'ok' | 'fehler' | 'uebersprungen' | 'wartet' | 'server'
  meldung?: string
  werte?: Record<string, unknown>
  ziel?: string | null
}

/** Ein Lauf einer Automation für einen Datensatz. */
export interface Lauf {
  id: string
  automation_id: string
  ereignis: string
  tabelle: string | null
  bezug_id: string | null
  titel: string | null
  stand: LaufStand
  schritt: number
  weiter_am: string
  protokoll: ProtokollEintrag[]
  fehler: number
  erstellt_am: string
  beendet_am: string | null
  gestoppt_grund?: string | null
}

/** Einstellungen der Auslöser nach Datum (einstellungen.automationen). */
export interface AutomationsEinstellungen {
  wartung_vorlauf_tage: number
  rechnung_karenz_tage: number
  termin_gehabt_tage: number
  bewertung_link: string
  versandfenster?: Versandfenster
  kontakt_pause_tage?: number
  lead_ohne_kontakt_tage?: number
  garantie_vorlauf_tage?: number
  feiertage?: string[]
  /** Geschätzte Minuten je erledigtem Schritt (für «Diese Woche erledigt»). */
  minuten?: Record<string, number>
}

/** Reiter der Seite (#/automations?ansicht=…). */
export const ANSICHTEN = ['uebersicht', 'liste', 'geplant', 'protokoll', 'einstellungen'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Ein geplanter Schritt (wartender oder gestoppter Lauf), aus automation_geplant. */
export interface Geplant {
  lauf_id: string
  automation_id: string
  name_de: string
  name_fr: string
  titel: string | null
  tabelle: string | null
  bezug_id: string | null
  stand: LaufStand
  weiter_am: string
  schritt: number
  schritte: number
  art: AktionsArt | null
  text_de: string | null
  text_fr: string | null
  nach_aussen: boolean
  modus: Modus
  grund: string | null
  /** Darf die angemeldete Person stoppen und verschieben? */
  darf: boolean
}

/** Ein Eintrag «Braucht Aufmerksamkeit». */
export interface Aufmerksamkeit {
  lauf_id: string
  automation_id: string
  titel: string | null
  ziel: string | null
  nr: string
  art: string
  ergebnis: ProtokollEintrag['ergebnis']
  meldung: string | null
  werte: Record<string, unknown> | null
  zeit: string
}

/** Übersicht (automation_uebersicht). */
export interface Uebersicht {
  motor: { zuletzt_am: string | null; ok: boolean | null; meldung: string | null } | null
  aktiv: number
  alle: number
  wartend: number
  wirkung: Record<string, number>
  minuten: Record<string, number>
  mails_wartend: number
  mails_freigegeben: number
  mails_alt: number
  rechnungen_rappen: number
  probleme: number
  probleme_vorwoche: number
  aufmerksamkeit: Aufmerksamkeit[]
  ausgeschaltet: { id: string; name_de: string; name_fr: string; seit: string; von: string | null }[]
  naechste: Geplant[]
}

/** Kennzahlen je Automation (30 Tage). */
export interface Kennzahl {
  automation_id: string
  laeufe: number
  mit_fehler: number
  zuletzt_am: string | null
  wartend: number
}

/** Ein Schritt im Probelauf. */
export interface ProbeSchritt {
  nr: number
  art: string
  wann: string
  ergebnis: ProtokollEintrag['ergebnis']
  meldung?: string
  an?: string
  personen?: string
  betreff?: string
  text?: string
  faellig?: string
  werte?: Record<string, unknown> | null
}

/** Ergebnis des Probelaufs. */
export interface Probelauf {
  titel: string | null
  sprache: 'de' | 'fr'
  schritte: ProbeSchritt[]
}

/** Eine Änderung an einer Automation. */
export interface Aenderung {
  zeitpunkt: string
  person: string
  aktion: string
  felder: string[]
}
