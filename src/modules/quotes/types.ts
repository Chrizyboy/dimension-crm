/** Fachliche Typen des Moduls «Offerten». */

/** Die Reiter des Bereichs (V233: Neue Offerten · Offerten Muri · Offerten Bulle · Nachfassen · PDF-Import). */
export type OffertAnsicht = 'eingang' | 'muri' | 'bulle' | 'nachfassen' | 'import'

export const OFFERT_ANSICHTEN: readonly OffertAnsicht[] = ['eingang', 'muri', 'bulle', 'nachfassen', 'import']

/** Status in «Neue Offerten» (Innendienst, V72/V76/V84). */
export type EingangStatus = 'neu' | 'bearbeitung' | 'rueckfrage' | 'pruefung' | 'offeriert'

export const EINGANG_STATUS: readonly EingangStatus[] = ['neu', 'bearbeitung', 'rueckfrage', 'pruefung', 'offeriert']

/** Ein Lead in «Neue Offerten» (Ansicht `offerten_eingang`). */
export interface Eingang {
  id: string
  leadNummer: string | null
  kontaktId: string
  name: string
  plz: string | null
  ort: string | null
  strasse: string | null
  standort: 'muri' | 'bulle' | null
  sprache: 'de' | 'fr'
  terminAm: string | null
  terminPersonId: string | null
  terminPersonName: string | null
  richtofferte: boolean
  zurOfferteAm: string | null
  status: EingangStatus
  /** Vorname der Person, die gerade daran arbeitet («In Bearbeitung von Loris»). */
  von: string | null
  seit: string | null
  hinweis: string | null
  hinweisVon: string | null
  rueckfrage: string | null
  kommentarKunde: string | null
  notizIntern: string | null
  offerteId: string | null
  offerteNummer: string | null
  betragRappen: number | null
  kwp: number | null
  suchtext: string
}

/** Eine Version der Offerte (V67). Ältere Einträge aus V233 haben «wert» statt «betrag_rappen». */
export interface OffertVersion {
  v: number
  am: string | null
  by: string | null
  text: string | null
  betragRappen: number | null
  kwp: number | null
  batterie: string | null
  dokument: { pfad?: string; name?: string; url?: string } | null
}

/** Werte der Wirtschaftlichkeit aus dem Eturnity-PDF. */
export interface Wirtschaftlichkeit {
  jahresertragKwh?: number | undefined
  verbrauchKwh?: number | undefined
  eigenverbrauchProzent?: number | undefined
  autarkieProzent?: number | undefined
  batterieKwh?: number | undefined
  eivRappen?: number | undefined
  steuerersparnisRappen?: number | undefined
  effektiveKostenRappen?: number | undefined
  ertrag25JahreRappen?: number | undefined
  renditeProzent?: number | undefined
  solarstrompreisRappen?: number | undefined
}

/** Eine Offerte in den Listen Muri/Bulle und Nachfassen (Ansicht `offerten_liste`). */
export interface Offerte {
  id: string
  nummer: string
  titel: string | null
  status: string
  stand: string
  sprache: 'de' | 'fr'
  standort: 'muri' | 'bulle' | null
  standortId: string | null
  angebotAm: string | null
  angebotAmFrueher: string[]
  faelligAm: string | null
  betragRappen: number | null
  kwp: number | null
  anzahlModule: number | null
  wechselrichter: string | null
  batterie: string | null
  entscheid: string | null
  entscheidAm: string | null
  vertagtGrund: string | null
  verlustgrund: string | null
  nachfassenAm: string | null
  verantwortlichId: string | null
  verantwortlichName: string | null
  eturnityId: string | null
  versionen: OffertVersion[]
  wirtschaftlichkeit: Wirtschaftlichkeit | null
  verkaufschanceId: string | null
  kontaktId: string
  kundennummer: number
  name: string
  telefon: string | null
  email: string | null
  plz: string | null
  ort: string | null
  strasse: string | null
  imEingang: boolean
  projektId: string | null
  werkvertragId: string | null
  werkvertragStatus: string | null
  geaendertAm: string | null
  suchtext: string
}

/** Werte, die aus einem Eturnity-PDF gelesen wurden (V91, V183). */
export interface PdfWerte {
  nummer?: string
  datum?: string
  kunde?: string
  sprache?: 'de' | 'fr'
  /** Total exkl. MWST nach Rabatt. */
  betragRappen?: number | undefined
  totalInklRappen?: number | undefined
  kwp?: number | undefined
  anzahlModule?: number | undefined
  modul?: string
  wechselrichter?: string
  batterie?: string
  batterieKwh?: number | undefined
  rabattProzent?: number | undefined
  wirtschaftlichkeit: Wirtschaftlichkeit
}

/** Meldung aus Eturnity (Webhook), wartet auf Zuordnung. */
export interface EturnityMeldung {
  id: string
  ereignis: string | null
  eturnityId: string | null
  offertnummer: string | null
  empfangenAm: string
  daten: unknown
}
