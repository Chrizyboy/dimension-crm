/**
 * Ein Kontakt, wie ihn Listen, Suche und der Kopf der Kundenakte brauchen
 * (aus der Ansicht `kunden_uebersicht`). Gemeinsam für Kunden, Adressbuch und Befehlspalette.
 */
export interface Kontaktzeile {
  id: string
  kundennummer: number
  art: 'person' | 'firma'
  kontaktart: string
  anrede: string | null
  vorname: string | null
  nachname: string | null
  firma: string | null
  name: string
  email: string | null
  telefon: string | null
  sprache: 'de' | 'fr'
  werbesperre: boolean
  notiz: string | null
  objektId: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  anzahlObjekte: number
  /** Schlüssel aus der Auswahlliste «kundenstand», null ohne Geschäft (z. B. Lieferant). */
  stand: string | null
  standDatum: string | null
  standGruppe: string | null
  standRang: number | null
  /** Geschäft, aus dem der Stand stammt (Tabelle und ID). */
  standTabelle: string | null
  standBezug: string | null
  letzterKontakt: string | null
  anzahlOfferten: number
  anzahlProjekte: number
  moeglicheDublette: boolean
  geloeschtAm: string | null
  erstelltAm: string
  /** Kleingeschriebener Suchtext (Name, Adresse, Mail, Kunden- und Offertnummern). */
  suchtext: string
  telefonZiffern: string
}

/** Ein Wert aus einer Auswahlliste (Konfiguration als Daten, CLAUDE.md Regel 8). */
export interface Auswahlwert {
  schluessel: string
  text_de: string
  text_fr: string
  reihenfolge: number
  farbe: string | null
  eigenschaften: Record<string, unknown>
}
