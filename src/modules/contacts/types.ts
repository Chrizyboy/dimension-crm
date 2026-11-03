/**
 * Fachliche Typen des Moduls «Adressbuch» (Geschäftspartner, Entscheid 0049). Kunden bleiben im Modul «Kunden»;
 * mit «auch Kunden zeigen» erscheinen sie als `Kontaktzeile` aus `@/types/kontakt`.
 */
export type { Kontaktzeile } from '@/types/kontakt'

/** Rollen eines Partners (Schlüssel der Auswahlliste «partnerrolle»). */
export type Rolle =
  | 'netzbetreiber'
  | 'lieferant'
  | 'hersteller'
  | 'subunternehmer'
  | 'gemeinde'
  | 'architekt'
  | 'elektriker'
  | 'vermittler'
  | 'partner'

/** Feldtyp eines Rollen-Felds; bestimmt Eingabe und Anzeige. */
export type Feldtyp = 'text' | 'lang' | 'url' | 'email' | 'telefon' | 'zahl' | 'prozent' | 'chf' | 'datum'

/** Ein Feld einer Rolle, als Daten in der Auswahlliste (Regel 8: Konfiguration statt Code). */
export interface Rollenfeld {
  k: string
  t: Feldtyp
  de: string
  fr: string
}

/** Eine Zeile der Partnerliste (Sicht `adressbuch_uebersicht`). */
export interface Partnerzeile {
  id: string
  kundennummer: number | null
  art: 'person' | 'firma'
  name: string
  email: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  geloeschtAm: string | null
  rollen: string[]
  strasse: string | null
  plz: string | null
  ort: string | null
  webseite: string | null
  uidNr: string | null
  hauptkontakt: string | null
  hauptkontaktTelefon: string | null
  hauptkontaktEmail: string | null
  anzahlPersonen: number
  zuletzt: string | null
  nachweisBis: string | null
  gesucheOffen: number
  gesucheAlt: number
  gesucheTage: number | null
  gemeinden: number
  auftraegeLaufend: number
  auftraege: number
  bewertung: number | null
  provisionProzent: number | null
  kundennummerBei: string | null
  gewerk: string | null
  suchtext: string
  telefonZiffern: string
}

/** Kopf eines Partners (Kontakt + Postadresse), für die Akte und den Stammdaten-Dialog. */
export interface PartnerKopf {
  id: string
  kundennummer: number | null
  art: 'person' | 'firma'
  name: string
  firma: string | null
  vorname: string | null
  nachname: string | null
  email: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  notiz: string | null
  geloeschtAm: string | null
  angabenId: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  land: string
  webseite: string | null
  uidNr: string | null
  rechtsform: string | null
}

/** Eine Rolle mit ihren Angaben (jsonb, Schlüssel aus den Rollenfeldern). */
export interface PartnerRolle {
  id: string
  rolle: string
  angaben: Record<string, unknown>
  aktiv: boolean
}

export interface Nachweis {
  id: string
  art: string
  gueltig_bis: string | null
  notiz: string | null
  dokument_id: string | null
  speicher_pfad: string | null
  sharepoint_url: string | null
  datei: string | null
}

export interface Gesuch {
  projekt_id: string
  nummer: string
  kunde: string
  ort: string | null
  stand: string
  eingereicht_am: string
  tage: number
}

export interface Bestellung {
  id: string
  nummer: string
  status: string
  liefertermin: string | null
  total_rappen: number | null
  bestellt_am: string | null
  projekt: string | null
}

export interface Auftrag {
  id: string
  projekt_id: string
  projekt: string
  kunde: string
  leistung: string
  betrag_rappen: number | null
  termin_von: string | null
  termin_bis: string | null
  status: string
  qualitaet: number | null
  termin: number | null
  preis: number | null
}

export interface Empfehlung {
  id: string
  status: string
  neukunde: string | null
  lead_nummer: string | null
  projekt_nummer: string | null
  betrag_rappen: number | null
  ausbezahlt_am: string | null
  erstellt_am: string
}

export interface Dokument {
  id: string
  name: string
  ordner: string | null
  speicher_pfad: string | null
  sharepoint_url: string | null
  erstellt_am: string
}

/** Alles, was die Akte rechts und in der Mitte zeigt, aus `partner_akte()` in einer Abfrage. */
export interface PartnerAkte {
  rollen: PartnerRolle[]
  nachweise: Nachweis[]
  gesuche: Gesuch[]
  gemeinden: string[]
  projekte: number
  bestellungen: Bestellung[]
  einkaufJahr: { total_rappen: number; anzahl: number }
  auftraege: Auftrag[]
  empfehlungen: Empfehlung[]
  dokumente: Dokument[]
}

/** Firma aus dem UID-Register (Vorschlag beim Anlegen). */
export interface UidFirma {
  uid: string
  name: string
  rechtsform: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  aktiv: boolean
}

/** Möglicher Doppelter beim Anlegen. */
export interface PartnerDublette {
  id: string
  kundennummer: number | null
  name: string
  ort: string | null
  grund: 'uid' | 'email' | 'telefon' | 'name'
}

/** Stand des Netzbetreiber-Verzeichnisses (ElCom). */
export interface NetzStand {
  gemeinden: number
  netzbetreiber: number
  jahr: number | null
  eingelesen_am: string | null
  plz_total: number
  plz_zugeordnet: number
  gebaeude: number
  gebaeude_ohne: number
}

/** Eingabe für «Neuer Eintrag». */
export interface NeuerPartnerEingabe {
  art: 'person' | 'firma'
  name: string
  vorname?: string
  email: string
  telefon: string
  sprache: 'de' | 'fr'
  strasse: string
  plz: string
  ort: string
  webseite: string
  uidNr: string
  rechtsform: string
  rollen: string[]
  angaben: Record<string, Record<string, unknown>>
  /** Erste Ansprechperson (nur bei Firmen, freiwillig). */
  person?: { vorname: string; nachname: string; funktion: string; telefon: string; email: string }
}
