/** Fachliche Typen des Moduls «Werkverträge». */

export type WerkvertragStatus = 'entwurf' | 'erstellt' | 'versendet' | 'unterschrieben' | 'storniert'

export const WERKVERTRAG_STATUS: readonly WerkvertragStatus[] = [
  'entwurf',
  'erstellt',
  'versendet',
  'unterschrieben',
  'storniert',
]

/** Eine Tranche des Zahlungsplans (Rappen, inkl. MWST). */
export interface Tranche {
  bezeichnung: string
  betragRappen: number
  faelligAm: string | null
  bezahltAm?: string | null
}

/** Eine Tranche einer Zahlungskondition (Auswahlliste «zahlungskondition»). */
export interface KonditionTranche {
  /** Anteil am Vertragswert; fehlt bei der eigenen Anzahlung (betrag = true). */
  anteil?: number
  /** Die Rate ist ein fester Betrag (eigene Anzahlung in CHF). */
  betrag?: boolean
  de: string
  fr: string
  faellig?: 'unterschrift' | 'baubeginn'
  tage?: number
}

/** Zahlungsbedingung am Vertrag: Vorlage (70_30, 100 …) oder eigene Anzahlung in Rappen. */
/** Eine eigene Rate: Bezeichnung (im Vertrag und auf der Rechnung) und Anteil in Prozent. */
export interface EigeneRate {
  text: string
  prozent: number
}

export interface Zahlung {
  kondition: string
  anzahlung_rappen?: number
  /** Nur bei «eigene»: frei festgelegte Raten, zusammen 100 %. */
  raten?: EigeneRate[]
}

/** Angaben im Vertrag (Seite 1 und 2 der Vorlage Muri); leere Felder nehmen den Vorschlag aus der Offerte. */
export interface VertragAngaben {
  gegenstand?: string
  material?: string
  beginn?: string
  fertig?: string
  ansprechperson?: string
  optionen?: { monitoring?: boolean; wartung?: boolean; divers?: string }
  zahlung?: Zahlung
}

/** Erste Rate (Anzahlung) mit ihrer Rechnung, falls es schon eine gibt. */
export interface Anzahlung {
  betragRappen: number
  rechnungNr: string | null
  rechnungId: string | null
  rechnungStatus: string | null
  bezahltAm: string | null
  abaninja: boolean
}

/** Einstellung «werkvertrag»: Unterzeichner, Ansprechperson, Kontakt und Standard-Bedingungen (nur Administration). */
export interface WerkvertragEinstellung {
  unterzeichner: string
  ansprechperson: string
  /** Hauptnummer im deutschen Vertrag (Muri). */
  telefon_de: string | null
  /** Hauptnummer im französischen Vertrag (Bulle). */
  telefon_fr: string | null
  email: string | null
  adresse: string
  kondition_pv: string
  kondition_batterie: string
}

/** Ein Werkvertrag mit Kunde, Objekt, Firma und Zahlungsplan (Ansicht `werkvertraege_liste`). */
export interface Werkvertrag {
  id: string
  nummer: string
  status: WerkvertragStatus
  sprache: 'de' | 'fr'
  version: number
  betragRappen: number | null
  erstelltDatum: string | null
  versendetAm: string | null
  unterschriebenAm: string | null
  notiz: string | null
  offerteId: string | null
  projektId: string | null
  kontaktId: string
  name: string
  kundennummer: number
  anrede: string | null
  vorname: string | null
  nachname: string | null
  kontaktFirma: string | null
  email: string | null
  telefon: string | null
  kontaktAdresse: { strasse: string | null; plz: string | null; ort: string | null }
  objekt: { strasse: string | null; plz: string | null; ort: string | null }
  firma: {
    name: string | null
    strasse: string | null
    plz: string | null
    ort: string | null
    mwstNr: string | null
    telefon?: string | null
    email?: string | null
  }
  offerteNummer: string | null
  angebotAm?: string | null
  titel: string | null
  kwp: number | null
  anzahlModule: number | null
  wechselrichter: string | null
  batterie: string | null
  baubeginn: string | null
  kondition: string | null
  standort: 'muri' | 'bulle' | null
  zahlungsplan: Tranche[]
  suchtext: string
  angaben: VertragAngaben
  anzahlung: Anzahlung | null
}

/** Was «Auftrag erstellen» über die angenommene Offerte wissen muss. */
export interface AuftragsOfferte {
  id: string
  nummer: string
  name: string
  standortId: string | null
  standort: 'muri' | 'bulle' | null
  sprache: 'de' | 'fr'
  betragRappen: number | null
  kwp: number | null
  anzahlModule: number | null
  batterie: string | null
  status: string
  projektId: string | null
  ort?: string | null
  wechselrichter?: string | null
  titel?: string | null
  /** Bestehender Vertrag zur Offerte (für «Bearbeiten»): Angaben und Wert inkl. MWST. */
  vertrag?: { angaben: VertragAngaben; betragRappen: number | null; unterzeichnet: string | null } | null
}
