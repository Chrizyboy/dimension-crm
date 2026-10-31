/** Fachliche Typen des Moduls «Grossprojekte» (Phase 8c, Contracting-Monitor). */

/** Reiter der Seite. */
export const ANSICHTEN = ['pruefen', 'beobachten', 'bewilligt', 'alle', 'annahmen'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

export type Stand = 'pruefen' | 'beobachten' | 'bewilligt' | 'verworfen'
export type ContractingArt = 'pv' | 'waerme' | 'beides'

export const BAUHERR_ARTEN = [
  'gemeinde',
  'kanton',
  'genossenschaft',
  'pensionskasse',
  'immobilien',
  'gewerbe',
  'landwirtschaft',
  'kirche',
  'privat',
  'unbekannt',
] as const
export type BauherrArt = (typeof BAUHERR_ARTEN)[number]

export const NUTZUNGEN = [
  'industrie',
  'gewerbe',
  'kuehlung',
  'spital',
  'heim',
  'schule',
  'sport',
  'verwaltung',
  'ueberbauung',
  'mfh',
  'landwirtschaft',
  'efh',
  'andere',
] as const
export type Nutzung = (typeof NUTZUNGEN)[number]

export const HEIZUNGEN = ['oel', 'gas', 'elektro', 'holz', 'waermepumpe', 'fernwaerme', 'unbekannt'] as const
export type Heizung = (typeof HEIZUNGEN)[number]

/** Ein Baustein der Punkte («Warum passt es?»). */
export interface PunkteTeil {
  was: 'dach' | 'nutzung' | 'heizung' | 'heizungsersatz' | 'bauherr' | 'fahrzeit' | 'wohnungen'
  punkte: number
  wert: string | number | null
  jahr?: number | null
  kw?: number | null
}

/** Grobe Schätzung der Datenbank (Beträge in Rappen). */
export interface Schaetzung {
  kwp?: number
  ertrag_kwh?: number
  investition_rappen?: number
  preis_rp_kwh?: number
  waerme_kw?: number
  waerme_investition_rappen?: number
  waerme_rate_rappen?: number
}

/** Ein Grossprojekt, wie die Liste und die Akte es zeigen. */
export interface Grossprojekt {
  id: string
  nummer: string
  titel: string
  beschreibung: string | null
  quelle: string
  quell_url: string
  ausschreibung_id: string | null
  strasse: string | null
  plz: string | null
  gemeinde: string | null
  kanton: string | null
  parzelle: string | null
  sprache: 'de' | 'fr'
  fahrzeit_min: number | null
  lage_e: number | null
  lage_n: number | null
  bauherr: string | null
  bauherr_art: BauherrArt | null
  nutzung: Nutzung | null
  geschuetzt: boolean
  heizungsersatz: boolean
  dachflaeche_m2: number | null
  dach_klasse: number | null
  stromertrag_kwh: number | null
  heizung: Heizung | null
  heizung_jahr: number | null
  waermeleistung_kw: number | null
  wohnungen: number | null
  baujahr: number | null
  egid: string | null
  angereichert_am: string | null
  anreicherung: string | null
  punkte: number
  punkte_details: PunkteTeil[]
  art: ContractingArt | null
  ausschluss: 'geschuetzt' | 'efh' | 'fahrzeit' | 'zu_klein' | null
  schaetzung: Schaetzung
  stand: Stand
  wiedervorlage_am: string | null
  grund: string | null
  entschieden_am: string | null
  verkaufschance_id: string | null
  notiz: string | null
  erstellt_am: string
  standort: string | null
  entschieden_von: string | null
}

/** Eintrag im Verlauf. */
export interface Vermerk {
  id: string
  zeitpunkt: string
  text: string | null
  person: string | null
}

/** Die Annahmen und Schwellen aus «einstellungen.grossprojekte» (Ausschnitt für die Anzeige). */
export interface GrossprojektRegeln {
  bewilligen?: string[]
  bewilligen_vertretung?: string[]
  melden_ab?: number
  fahrzeit_max?: number
  punkte?: { dach?: { ab_m2?: number; voll_m2?: number }; heizung_ab_kw?: number; zu_klein_m2?: number }
  annahmen?: {
    kwp_pro_m2?: number
    kwh_pro_kwp?: number
    chf_pro_kwp?: { bis: number | null; chf: number }[]
    zins_prozent?: number
    laufzeit_jahre?: number
    betrieb_prozent?: number
    marge_prozent?: number
    kw_pro_wohnung?: number
    chf_pro_kw_waerme?: number
    laufzeit_waerme_jahre?: number
  }
}
