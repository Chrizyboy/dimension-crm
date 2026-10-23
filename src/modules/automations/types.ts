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

export type LaufStand = 'laeuft' | 'wartet' | 'server' | 'fertig' | 'uebersprungen' | 'fehler' | 'abgebrochen'

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
}

/** Einstellungen der Auslöser nach Datum (einstellungen.automationen). */
export interface AutomationsEinstellungen {
  wartung_vorlauf_tage: number
  rechnung_karenz_tage: number
  termin_gehabt_tage: number
  bewertung_link: string
}

/** Reiter der Seite (#/automations?ansicht=…). */
export const ANSICHTEN = ['liste', 'protokoll', 'einstellungen'] as const
export type Ansicht = (typeof ANSICHTEN)[number]
