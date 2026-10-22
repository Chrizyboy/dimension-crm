/** Fachliche Typen des Moduls «Projekte & Montage» (Phase 9). */

/** Reiter der Seite; steht in der Adresse (#/projects?reiter=zeitplan). */
export const REITER = ['baustellen', 'zeitplan', 'bewilligungen', 'alle', 'subunternehmer', 'abwesenheiten'] as const
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
