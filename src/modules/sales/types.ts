/** Fachliche Typen des Moduls «Anfragen & Leads». */

/** Die Ansichten des Bereichs (V233: Leads · Tagesroute · Tour planen · Kalender · Regionen · Monatsbericht). */
export type VerkaufAnsicht =
  'zutun' | 'pipeline' | 'liste' | 'tagesroute' | 'tour' | 'kalender' | 'regionen' | 'bericht' | 'steuerung'

/** Alle Ansichten (Adresse `?ansicht=`); die Reiter fassen Kalender, Tagesroute und Tour unter «Planung» zusammen. */
export const VERKAUF_ANSICHTEN: readonly VerkaufAnsicht[] = [
  'zutun',
  'pipeline',
  'liste',
  'kalender',
  'tagesroute',
  'tour',
  'regionen',
  'bericht',
  'steuerung',
]

/** Die drei Teile der Planung (03.11.2026): Woche im Kalender, Route eines Tages, Tour über mehrere Tage. */
export const PLANUNG_ANSICHTEN: readonly VerkaufAnsicht[] = ['kalender', 'tagesroute', 'tour']

/** Ein Reiter oben: eine Ansicht oder «planung» für die drei Planungsansichten. */
export type VerkaufReiter = Exclude<VerkaufAnsicht, 'tagesroute' | 'tour' | 'kalender'> | 'planung'

/** Reihenfolge der Reiter und der Tasten 1–7; «Zu tun» ist die Startansicht (02.11.2026). */
export const VERKAUF_REITER: readonly VerkaufReiter[] = [
  'zutun',
  'pipeline',
  'liste',
  'planung',
  'regionen',
  'bericht',
  'steuerung',
]

/** Zu welchem Reiter eine Ansicht gehört. */
export function reiterVon(a: VerkaufAnsicht): VerkaufReiter {
  return PLANUNG_ANSICHTEN.includes(a) ? 'planung' : (a as VerkaufReiter)
}

/** Welche Ansicht ein Reiter öffnet; «Planung» beginnt mit dem Kalender. */
export function ansichtVon(r: VerkaufReiter): VerkaufAnsicht {
  return r === 'planung' ? 'kalender' : r
}

/**
 * Ein Geschäft der Pipeline: ein Lead mit seiner jüngsten Offerte und seinem Projekt,
 * oder eine Offerte/ein Projekt ohne Lead aus V233 (Ansicht `verkauf_geschaefte`).
 */
export interface Geschaeft {
  id: string
  art: 'verkaufschancen' | 'offerten' | 'projekte'
  verkaufschanceId: string | null
  offerteId: string | null
  projektId: string | null
  /** L001 …, sonst Offert- oder Projektnummer. */
  nummer: string
  offerteNummer: string | null
  kontaktId: string
  kundennummer: number
  name: string
  telefon: string | null
  email: string | null
  sprache: 'de' | 'fr'
  werbesperre: boolean
  objektId: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  /** Lage für Karte und Route: genau, falls erfasst, sonst Mitte der PLZ. */
  breite: number | null
  laenge: number | null
  lageGenau: boolean
  hoehe: number | null
  standort: 'muri' | 'bulle' | null
  regionId: string | null
  personId: string | null
  /** «Termin bei» (Aussendienst). */
  terminPersonId: string | null
  stufe: string | null
  offerteStatus: string | null
  quelle: string | null
  eingangAm: string | null
  terminAm: string | null
  terminDauerMin: number | null
  wiedervorlageAm: string | null
  wiedervorlageGrund: string | null
  verlustgrund: string | null
  erreichbarkeit: string | null
  interesse: string[]
  kommentarKunde: string | null
  angebotAm: string | null
  nachfassenAm: string | null
  vertagtGrund: string | null
  /** Offert- oder Vertragswert in Rappen. */
  wertRappen: number | null
  kwp: number | null
  /** Schlüssel aus «kundenstand» (16 Stände) und seine Gruppe (6). */
  stand: string
  standRang: number
  gruppe: string
  standDatum: string | null
  letzterKontakt: string | null
  geaendertAm: string | null
  suchtext: string
  telefonZiffern: string
  /** Eingang mit Uhrzeit (Lead angelegt), für die 15-Minuten-Uhr. */
  eingangZeit: string | null
  /** Erster Anruf, Mail, SMS oder Besuch beim Kunden. */
  erstkontaktAm: string | null
  /** Woher: Formular, Seite, Kampagne (utm_*), Kontaktwunsch. */
  herkunft: Record<string, string>
  /** Dach aus Website-Formular (`website`) und sonnendach.ch (`sonnendach`). */
  dach: LeadDach
  verbrauchKwh: number | null
  gebaeudeart: string | null
  entscheidAm: string | null
  /** Aus V233 übernommen (zählt nicht für Tempo und Quoten). */
  uebernommen: boolean
}

/** Dachdaten am Gebäude (objekte.dach). */
export interface LeadDach {
  website?: { flaeche_m2?: number; ertrag_kwh?: number; egid?: string }
  /** Format von _shared/gebaeude.ts (sonnendach.ch und Gebäuderegister). */
  sonnendach?: {
    dachflaeche_m2?: number
    stromertrag_kwh?: number
    /** 3 gut, 4 sehr gut, 5 hervorragend. */
    dach_klasse?: number
    heizung?: string
    heizung_jahr?: number
    baujahr?: number
    wohnungen?: number
    egid?: string
  }
  gesucht_am?: string
  meldung?: string
}

/** Angaben, die ein Wechsel des Stands braucht (Grund, Datum, Termin). */
export interface StandAngaben {
  datum?: string
  grund?: string
  notiz?: string
  termin_am?: string
  dauer_min?: number
  person_id?: string
  richtofferte?: boolean
  /** Nach «nicht erreicht»: SMS-Entwurf in den Ausgangskorb. */
  sms?: boolean
  /** Nach «kein Interesse»/«ungültig»: wann der Lead wieder vorgelegt wird. */
  wiedervorlage_am?: string
}

/** Was ein Stand beim Wechsel abfragt (V170). */
export type StandBedarf = 'nichts' | 'grund' | 'datumGrund' | 'termin' | 'gesendet' | 'richtofferte'

/** Filter über Pipeline und Liste, auch Teil einer gespeicherten Ansicht. */
export interface VerkaufFilter {
  suche: string
  standorte: string[]
  personen: string[]
  quellen: string[]
  regionen: string[]
}

export const LEERER_FILTER: VerkaufFilter = { suche: '', standorte: [], personen: [], quellen: [], regionen: [] }

/** Eine Person mit Kundenterminen (Aussendienst). */
export interface Aussendienst {
  id: string
  kuerzel: string
  name: string
  vorname: string
  standort: 'muri' | 'bulle' | null
  /** Heimadresse aus «Mein Konto» als Start der Route. */
  heim: { strasse: string; plz: string; ort: string } | null
}

/** Ein Ort mit Lage, z. B. Standort, Zuhause oder ein Lead. */
export interface Punkt {
  breite: number
  laenge: number
}
