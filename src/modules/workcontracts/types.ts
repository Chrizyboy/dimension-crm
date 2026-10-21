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
  anteil: number
  de: string
  fr: string
  faellig?: 'unterschrift' | 'baubeginn'
  tage?: number
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
  firma: { name: string | null; strasse: string | null; plz: string | null; ort: string | null; mwstNr: string | null }
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
}
