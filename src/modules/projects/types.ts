/** Fachliche Typen des Moduls «Projekte & Montage» (Phase 9). */

/** Reiter der Seite; steht in der Adresse (#/projects?reiter=zeitplan). */
export const REITER = [
  'leitstand',
  'woche',
  'zeitplan',
  'bewilligungen',
  'alle',
  'subunternehmer',
  'abwesenheiten',
] as const
export type Reiter = (typeof REITER)[number]

/** Reiter der Projekt-Akte. */
export const AKTE_REITER = ['uebersicht', 'fahrplan', 'zeitplan', 'subunternehmer'] as const
export type AkteReiter = (typeof AKTE_REITER)[number]

export type ProjektStatus = 'auftrag' | 'im_bau' | 'abgeschlossen'
export type BauStatus = 'ausstehend' | 'terminiert' | 'ibn' | 'fertig'
export type SchrittStand = 'offen' | 'teilweise' | 'erledigt' | 'nicht_noetig'
export type EinsatzArt = 'intern' | 'extern' | 'geplant'

/** Die sechs Phasen des Fahrplans in ihrer Reihenfolge (V108). */
export const PHASEN = ['auftrag', 'bew', 'vorb', 'montage', 'ibn', 'abschluss'] as const
export type Phase = (typeof PHASEN)[number]

/** Stand einer Phase für den Balken auf Karte und Akte. */
export interface PhasenStand {
  phase: Phase
  gesamt: number
  erledigt: number
  teilweise: boolean
  spaet: boolean
}

/** Der nächste offene Schritt eines Projekts. */
export interface NaechsterSchritt {
  schluessel: string
  phase: Phase
  name_de: string
  name_fr: string
  ueberfaellig: boolean
  frist: string | null
}

/** Ein Projekt, wie es Karten, Listen und der Zeitplan brauchen. */
export interface Projekt {
  id: string
  nummer: string
  titel: string | null
  status: ProjektStatus
  bau_status: BauStatus | null
  material_status: 'bestellt' | 'lager' | null
  baubeginn: string | null
  werktage: number | null
  unterzeichnet_am: string | null
  vertragswert_rappen: number | null
  vertrag_sprache: string | null
  elektriker: string | null
  architekt: string | null
  bau_vorher: unknown
  standort_id: string | null
  standort: string | null
  kontakt_id: string
  kunde: string
  telefon: string | null
  email: string | null
  sprache: 'de' | 'fr'
  objekt_id: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  offerte_id: string | null
  leistung_kwp: number | null
  anzahl_module: number | null
  wechselrichter: string | null
  batterie: string | null
  verantwortlich: string | null
  verantwortlich_id: string | null
  ablauf: string | null
  /** Zusammenfassung aus der Sicht `projekt_stand` (null, wenn keine Ablauf-Vorlage). */
  stand: {
    erledigt: number
    gesamt: number
    spaet: boolean
    bewilligungen_offen: number
    bewilligungen_spaet: number
    checkliste_erledigt: number
    checkliste_gesamt: number
    phasen: PhasenStand[]
    naechster: NaechsterSchritt | null
  } | null
}

/** Ein Schritt im Fahrplan eines Projekts (Sicht `projekt_fahrplan`). */
export interface FahrplanSchritt {
  projekt_id: string
  schluessel: string
  phase: Phase
  name_de: string
  name_fr: string
  reihenfolge: number
  bewilligung: boolean
  elektriker: boolean
  automatisch: boolean
  auto: string | null
  hinweis_de: string | null
  hinweis_fr: string | null
  stand: SchrittStand
  frist: string | null
  eigene_frist: string | null
  eingereicht_am: string | null
  erledigt_am: string | null
  notiz: string | null
  ueberfaellig: boolean
  bald: boolean
}

/** Ein Einsatz im Zeitplan: ein Team, ein Zeitraum. */
export interface Einsatz {
  id: string
  projekt_id: string
  art: EinsatzArt
  von: string
  bis: string
  personen: string[]
  subunternehmer_id: string | null
  notiz: string | null
}

/** Service-Termin aus «Service & Garantie» (Sicht service_termine), im Zeitplan neben den Baustellen. */
export interface ServiceTermin {
  id: string
  nummer: string
  titel: string
  datum: string
  termin_am: string
  dauer_minuten: number
  personen: string[]
  kunde: string | null
  ort: string | null
  auswirkung: string | null
}

/** Einsatz im Planungsdialog, noch nicht gespeichert (neu ohne id). */
export type EinsatzEntwurf = Omit<Einsatz, 'id' | 'projekt_id'> & { id?: string }

/** Eine Abwesenheit (CRM oder Outlook «Abwesend»). */
export interface Abwesenheit {
  id: string
  person_id: string
  art: string
  von: string
  bis: string
  halbtag: boolean
  quelle: 'crm' | 'outlook'
}

/** Eine Person für Einsätze und Abwesenheiten. */
export interface Person {
  id: string
  kuerzel: string
  name: string
  rolle: string | null
}

export interface Subunternehmer {
  id: string
  name: string
  gewerk: string | null
  email: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  aktiv: boolean
  notiz: string | null
}

export type SubauftragStatus = 'angefragt' | 'bestaetigt' | 'erledigt' | 'abgesagt'

export interface Subauftrag {
  id: string
  subunternehmer_id: string
  projekt_id: string
  leistung: string
  betrag_rappen: number | null
  termin_von: string | null
  termin_bis: string | null
  status: SubauftragStatus
  notiz: string | null
  angefragt_am: string | null
  bestaetigt_am: string | null
  subunternehmer: string
  projekt?: { nummer: string; kunde: string; ort: string | null }
}

/** Die vorausgefüllten Gesuche. */
export const GESUCHE = ['tag', 'meldung', 'foerderung'] as const
export type Gesuch = (typeof GESUCHE)[number]

/** Standort (Muri, Bulle) mit Firma für Druckblätter. */
export interface Standort {
  id: string
  kuerzel: string
  name: string
}

/** Signale je laufendem Projekt (Sicht `projekt_signale`): zeigen, worauf ein Projekt wartet. */
export interface Signale {
  projekt_id: string
  verantwortlich_id: string | null
  material_fehlt: number
  material_positionen: number
  letzte_lieferung: string | null
  naechster_einsatz: string | null
  letzte_aktivitaet: string | null
  tranchen_faellig_rappen: number
  offen_rappen: number
  offen_faellig_am: string | null
  nachtraege_offen: number
}

/** Schnellfilter im Leitstand. */
export const SCHNELLFILTER = ['meine', 'spaet', 'bewilligung', 'material', 'ohne_termin', 'verrechnen'] as const
export type Schnellfilter = (typeof SCHNELLFILTER)[number]

/** Ein Hinweis auf einer Karte: worauf das Projekt wartet oder was fehlt. */
export interface Hinweis {
  schluessel: string
  ton: 'kritisch' | 'warnung' | 'info' | 'ok' | 'neutral'
  werte?: Record<string, string | number>
}

/** Alles zu einem Projekt aus `projekt_akte()`. */
export interface Akte {
  verkauf: string | null
  einsaetze: {
    id: string
    art: EinsatzArt
    von: string
    bis: string
    notiz: string | null
    personen: string[]
    subunternehmer: string | null
  }[]
  material: {
    id: string
    bezeichnung: string
    menge: number
    einheit: string | null
    vorhanden: number
    unterwegs: number
    fehlt: number
  }[]
  bestellungen: { id: string; nummer: string; status: string; liefertermin: string | null; lieferant: string | null }[]
  tranchen: {
    id: string
    bezeichnung: string
    betrag_rappen: number
    faellig_am: string | null
    bezahlt_am: string | null
    rechnung_nr: string | null
    rechnung: { id: string; nummer: string | null; status: string } | null
  }[]
  rechnungen: {
    id: string
    nummer: string | null
    status: string
    titel: string
    datum: string | null
    faellig_am: string | null
    total_rappen: number
    bezahlt_rappen: number
  }[]
  nachtraege: { id: string; nummer: string; beschreibung: string; betrag_rappen: number | null; status: string }[]
  rapporte: {
    id: string
    nummer: string | null
    datum: string
    art: string
    arbeiten: string | null
    abgeschlossen_am: string | null
    person: string | null
    stunden: number | null
  }[]
  stunden: number
  verlauf: {
    quelle: 'aktivitaet' | 'mail'
    id: string
    art: string
    richtung: 'ein' | 'aus' | null
    zeit: string
    text: string | null
    ergebnis?: string | null
    betreff?: string | null
    person: string | null
  }[]
}

/** Nachkalkulation aus `nachkalkulation()`, Beträge exkl. MWST. */
export interface Nachkalkulation {
  soll: {
    verkauf_rappen: number | null
    einkauf_rappen: number | null
    werktage: number | null
    stunden: number | null
  }
  ist: {
    umsatz_rappen: number
    verrechnet_rappen: number
    material_rappen: number
    stunden: number
    arbeit_rappen: number
    marge_rappen: number
  }
}
