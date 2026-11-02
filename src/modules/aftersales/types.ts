/** Fachliche Typen des Moduls «Service & Garantie» (Phase 9, V233 «Service»). */

/** Reiter der Seite; steht in der Adresse (#/aftersales?reiter=anlagen). */
export const REITER = ['faelle', 'anlagen'] as const
export type Reiter = (typeof REITER)[number]

/** Was geladen wird: Leitstand (offen + in 14 Tagen erledigt), nur erledigte oder alle. */
export const FALL_FILTER = ['leitstand', 'offen', 'hoch', 'garantie', 'erledigt', 'alle'] as const
export type FallFilter = (typeof FALL_FILTER)[number]

/** Ansicht des Leitstands. */
export const ANSICHTEN = ['board', 'liste'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Spalten des Boards nach Arbeitsschritt; Ziehen in eine Spalte setzt den ersten Stand. */
export const BOARD = [
  { id: 'eingang', status: ['neu'] },
  { id: 'arbeit', status: ['bearbeitung', 'kunde'] },
  { id: 'geplant', status: ['termin'] },
  { id: 'teile', status: ['teile'] },
  { id: 'erledigt', status: ['erledigt'] },
] as const

/** Schnellfilter im Leitstand (mehrere zugleich). */
export const SCHNELLFILTER = ['meine', 'ueberfaellig', 'steht', 'garantie', 'website', 'ohne_kunde'] as const
export type Schnellfilter = (typeof SCHNELLFILTER)[number]

export const AUSWIRKUNGEN = ['steht', 'teilweise', 'keine'] as const
export const VERLAUF_ARTEN = ['notiz', 'anruf', 'mail', 'sms'] as const
export type VerlaufArt = (typeof VERLAUF_ARTEN)[number]

export const KATEGORIEN = [
  'stoerung',
  'garantie',
  'reklamation',
  'wartung',
  'erweiterung',
  'monitoring',
  'frage',
] as const
export const STATUS = ['neu', 'bearbeitung', 'termin', 'teile', 'kunde', 'erledigt'] as const
export const PRIORITAETEN = ['hoch', 'normal', 'tief'] as const

/** Ein Eintrag im Verlauf eines Falls. */
export interface Verlaufseintrag {
  am: string
  person_id: string | null
  /** notiz, anruf, mail, sms oder system; alte Einträge ohne Art sind Notizen. */
  art?: string
  text: string
}

/** Ein Schritt der Checkliste eines Falls. */
export interface Checkpunkt {
  de: string
  fr: string
  erledigt_am: string | null
  person_id: string | null
}

/** Rohdaten einer Störungsmeldung von der Website. */
export interface Meldung {
  name?: string
  email?: string
  telefon?: string
  adresse?: string
  projekt?: string
  stoerung?: string
  text?: string
  einwilligung?: string
  sprache?: string
  am?: string
}

/** Ein Service-Fall (S001 …). */
export interface ServiceFall {
  id: string
  nummer: string
  titel: string
  beschreibung: string | null
  kategorie: string | null
  prioritaet: string | null
  status: string
  garantie: boolean | null
  termin_am: string | null
  /** Weitere Personen im Einsatz (person_id leitet). */
  team: string[]
  /** Geplante Dauer in Minuten; ohne Angabe 2 Stunden. */
  dauer_minuten: number | null
  erledigt_am: string | null
  erstellt_am: string
  kontakt_id: string | null
  anlage_id: string | null
  projekt_id: string | null
  person_id: string | null
  verlauf: Verlaufseintrag[]
  quelle: string
  auswirkung: string | null
  reaktion_bis: string | null
  objekt_id: string | null
  vor_ort_name: string | null
  vor_ort_telefon: string | null
  zugang: string | null
  komponente: string | null
  fehlercode: string | null
  checkliste: Checkpunkt[]
  meldung: Meldung | null
  zuordnung: string | null
  kunde: string
  ort: string | null
  /** Einsatzort als eine Zeile (Strasse, PLZ Ort). */
  adresse: string | null
  sprache: 'de' | 'fr'
  projekt: string | null
  person: string | null
  kwp: number | null
}

/** Neuer oder geänderter Fall (ohne Nummer, die vergibt die Datenbank). */
export interface FallEingabe {
  titel: string
  beschreibung: string | null
  kategorie: string
  prioritaet: string
  status: string
  garantie: boolean
  termin_am: string | null
  kontakt_id: string | null
  anlage_id: string | null
  person_id: string | null
  quelle: string
  auswirkung: string | null
  objekt_id: string | null
  vor_ort_name: string | null
  vor_ort_telefon: string | null
  zugang: string | null
  komponente: string | null
  fehlercode: string | null
}

/** Eine Komponente der Anlage (PV, Batterie, Wallbox, Wärmepumpe, Notstrom …). */
export interface Komponente {
  art: string
  hersteller: string
  modell: string
  anzahl: number | null
  seriennummer: string
  garantie_bis: string | null
}

/** Anlage-Daten (V233): Komponenten, IBN, Garantie, Kontrolle, Monitoring. */
export interface Anlage {
  id: string
  objekt_id: string
  projekt_id: string | null
  ibn_am: string | null
  garantie_bis: string | null
  naechste_kontrolle: string | null
  leistung_kwp: number | null
  komponenten: Komponente[]
  monitoring: { hersteller?: string; link?: string; kennung?: string } | null
  notiz: string | null
  kontakt_id: string | null
  kunde: string
  adresse: string
  projekt: string | null
}

/** Eine Person für «zuständig». */
export interface Person {
  id: string
  name: string
}

/** Stände eines Garantiefalls beim Hersteller. */
export const GARANTIE_STATUS = [
  'offen',
  'gemeldet',
  'eingeschickt',
  'ersatz_erhalten',
  'abgeschlossen',
  'abgelehnt',
] as const

/** Defekte Komponente zurück an den Hersteller: RMA, Rücksendung, Ersatz, Gutschrift. */
export interface Garantiefall {
  id: string
  service_fall_id: string | null
  anlage_id: string | null
  hersteller: string
  komponente: string
  seriennummer: string | null
  rma_nummer: string | null
  status: (typeof GARANTIE_STATUS)[number]
  gemeldet_am: string | null
  eingeschickt_am: string | null
  ersatz_am: string | null
  gutschrift_rappen: number | null
  abgeschlossen_am: string | null
  notiz: string | null
}

/** Rapport zum Fall (aus service_akte). */
export interface AkteRapport {
  id: string
  nummer: string
  datum: string
  art: string
  verrechnung: string | null
  arbeiten: string | null
  abgeschlossen_am: string | null
  person: string | null
  stunden: number | null
}

/** Rechnung zum Fall oder zu einem seiner Rapporte. */
export interface AkteRechnung {
  id: string
  nummer: string | null
  status: string
  titel: string
  total_rappen: number
  bezahlt_rappen: number
  rapport_id: string | null
  datum: string | null
}

/** Alles rund um einen Fall in einer Abfrage (service_akte). */
export interface Akte {
  kunde: {
    id: string
    name: string
    telefon: string | null
    email: string | null
    sprache: string
    kundennummer: number
  } | null
  ort: {
    id: string
    strasse: string | null
    plz: string | null
    ort: string | null
    netzbetreiber: string | null
  } | null
  anlage: {
    id: string
    ibn_am: string | null
    garantie_bis: string | null
    naechste_kontrolle: string | null
    leistung_kwp: number | null
    komponenten: Partial<Komponente>[]
    monitoring: { hersteller?: string; link?: string; kennung?: string } | null
    notiz: string | null
  } | null
  projekt: { id: string; nummer: string; titel: string | null } | null
  vertrag: { id: string; nummer: string; naechste_wartung: string | null; rhythmus_monate: number | null } | null
  fruehere: { id: string; nummer: string; titel: string; status: string; erstellt_am: string }[]
  rapporte: AkteRapport[]
  rechnungen: AkteRechnung[]
  mails: {
    id: string
    betreff: string | null
    von_name: string | null
    von_email: string | null
    eingang_am: string
    zusammenfassung: string | null
  }[]
  rma_offen: number
}

/** Zahlen des Leitstands, die nicht aus der Fall-Liste kommen. */
export interface Leitstandzahlen {
  rma_offen: number
  zu_verrechnen: number
}

/** Wählbare Dauer eines Service-Einsatzes in Minuten (8 Stunden = ganzer Tag). */
export const DAUERN = [60, 120, 180, 240, 480] as const

/** Belegung einer Person am Tag eines Einsatzes (Hinweis beim Planen). */
export interface Belegung {
  person_id: string
  grund: 'abwesend' | 'baustelle' | 'service'
  text: string
}
