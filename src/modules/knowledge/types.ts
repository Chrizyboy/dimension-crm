/** Fachliche Typen des Moduls «Handbuch» (V233 Helpdesk: Anleitung, Prozesse, Videos, Meldungen). */

/** Reiter des Handbuchs, in der Adresse `#/knowledge?ansicht=…`. */
export const ANSICHTEN = ['anleitung', 'start', 'prozesse', 'videos', 'meldungen'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Eine abgelegte Datei (PDF, Video, Vorschaubild) aus `dokumente`. */
export interface HandbuchDatei {
  id: string
  name: string
  mime_typ: string | null
  bytes: number | null
  speicher_pfad: string | null
  sharepoint_url: string | null
}

/** Frühere Fassung eines Prozesses (neueste zuletzt). */
export interface FruehereVersion {
  version?: string
  datum?: string
  datei_de_id?: string
  datei_fr_id?: string
  ersetzt_am?: string
}

/** Prozess (PDF) oder Erklärvideo. Französische Fassung ist freiwillig; ohne sie gilt die deutsche. */
export interface HandbuchEintrag {
  id: string
  art: 'prozess' | 'video'
  titel_de: string
  titel_fr: string | null
  beschreibung_de: string | null
  beschreibung_fr: string | null
  version: string | null
  datum: string | null
  dauer_s: number | null
  reihenfolge: number | null
  sprache: 'de' | 'fr' | null
  versionen: FruehereVersion[]
  erstellt_am: string
  geaendert_am: string
  datei_de: HandbuchDatei | null
  datei_fr: HandbuchDatei | null
  vorschaubild: HandbuchDatei | null
}

/** Was beim Ablegen oder bei «Neue Version» gespeichert wird; Dateien werden vorher hochgeladen. */
export interface HandbuchEingabe {
  id: string | null
  art: 'prozess' | 'video'
  titel_de: string
  beschreibung_de: string
  titel_fr: string
  beschreibung_fr: string
  version: string
  datum: string | null
  sprache: 'de' | 'fr' | null
  reihenfolge: number | null
  datei_de: File | null
  datei_fr: File | null
}

export const MELDUNG_STATUS = ['neu', 'wartet', 'arbeit', 'info', 'erledigt', 'abgelehnt'] as const
export type MeldungStatus = (typeof MELDUNG_STATUS)[number]
export const PRIOS = ['niedrig', 'normal', 'dringend'] as const
export type Prio = (typeof PRIOS)[number]

/** Eine Meldung («Fehler melden»): Nummer T001, Text, Antwort der Administration. */
export interface Meldung {
  id: string
  nummer: number
  titel: string
  text: string
  erwartet: string | null
  bereich: string | null
  prio: Prio
  status: MeldungStatus
  antwort: string | null
  antwort_von: string | null
  beantwortet_am: string | null
  umgebung: string | null
  person_id: string | null
  person: string | null
  erstellt_am: string
  einschaetzung: Einschaetzung | null
  entscheid: 'erledigen' | 'nicht' | null
  entscheid_notiz: string | null
  entschieden_am: string | null
  umgesetzt_in: string | null
}

/** Einschätzung einer Meldung (vom Server geprüft, nur für die Administration sichtbar). */
export interface Einschaetzung {
  kurz: string
  was: string
  ursache?: string
  auswirkung?: string
  loesung?: string
  aufwand?: string
  risiko?: string
  empfehlung: 'erledigen' | 'nicht'
}

/** Wer über Meldungen entscheidet und ob dazu eine SMS kommt (Einstellung «helpdesk»). */
export interface HelpdeskStand {
  entscheider_person_id: string | null
  sms: boolean
  ich_entscheide: boolean
  kandidaten: { id: string; name: string; mobil: boolean }[]
}

export interface NeueMeldung {
  titel: string
  text: string
  erwartet: string
  bereich: string
  prio: Prio
  dateien: File[]
}
