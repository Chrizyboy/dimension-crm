/** Fachliche Typen des Moduls «Service & Garantie» (Phase 9, V233 «Service»). */

/** Reiter der Seite; steht in der Adresse (#/aftersales?reiter=anlagen). */
export const REITER = ['faelle', 'anlagen'] as const
export type Reiter = (typeof REITER)[number]

/** Filter der Fall-Liste. */
export const FALL_FILTER = ['offen', 'hoch', 'garantie', 'erledigt', 'alle'] as const
export type FallFilter = (typeof FALL_FILTER)[number]

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
  text: string
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
  erledigt_am: string | null
  erstellt_am: string
  kontakt_id: string | null
  anlage_id: string | null
  projekt_id: string | null
  person_id: string | null
  verlauf: Verlaufseintrag[]
  kunde: string
  ort: string | null
  sprache: 'de' | 'fr'
  projekt: string | null
  person: string | null
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
