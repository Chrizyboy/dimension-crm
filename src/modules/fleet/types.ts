/** Fachliche Typen des Moduls «Fahrzeuge & Geräte». */

/** Firmenfahrzeug mit MFK, Service und Kilometerstand. */
export interface Fahrzeug {
  id: string
  kennzeichen: string
  bezeichnung: string
  marke_modell: string | null
  jahrgang: number | null
  standort_id: string | null
  person_id: string | null
  km_stand: number | null
  km_stand_am: string | null
  naechste_mfk: string | null
  naechster_service: string | null
  service_km: number | null
  leasing_bis: string | null
  versicherung: string | null
  ausser_betrieb: boolean
  notiz: string | null
  art: string
  treibstoff: Treibstoff | null
  erste_inverkehrsetzung: string | null
  stammnummer: string | null
  fahrgestell_nr: string | null
  gesamtgewicht_kg: number | null
  nutzlast_kg: number | null
  anhaengelast_kg: number | null
  /** Nötiger Führerausweis als Schlüssel der Auswahlliste «qualifikation». */
  ausweis: string | null
  tankkarte: string | null
  schluessel: string | null
  kaufdatum: string | null
  kaufpreis_rappen: number | null
  leasinggeber: string | null
  leasing_vertrag: string | null
  leasing_beginn: string | null
  leasing_rate_rappen: number | null
  leasing_km_jahr: number | null
  leasing_mehr_km_rappen: number | null
  versicherung_police: string | null
  versicherung_deckung: string | null
  selbstbehalt_rappen: number | null
  schaden_telefon: string | null
  praemie_rappen: number | null
  verkehrssteuer_rappen: number | null
  reifen: string | null
  naechster_reifenwechsel: string | null
  vignette_bis: string | null
  privat_anteil: boolean
}

export const TREIBSTOFFE = ['diesel', 'benzin', 'elektro', 'hybrid', 'gas'] as const
export type Treibstoff = (typeof TREIBSTOFFE)[number]

export type GeraetZustand = 'ok' | 'maengel' | 'defekt' | 'ausser_betrieb'

/** Gerät (Messgerät, Absturzsicherung, Leiter …) mit Prüfintervall und wer es gerade hat. */
export interface Geraet {
  id: string
  art: string
  bezeichnung: string
  inventar_nr: string | null
  serien_nr: string | null
  hersteller: string | null
  standort_id: string | null
  person_id: string | null
  fahrzeug_id: string | null
  pruef_monate: number | null
  naechste_pruefung: string | null
  zustand: GeraetZustand
  notiz: string | null
  kaufdatum: string | null
  kaufpreis_rappen: number | null
  lieferant: string | null
  garantie_bis: string | null
  pruefstelle: string | null
  uebernommen_am: string | null
  zurueck_bis: string | null
  ausgemustert_am: string | null
  ausgemustert_grund: Ausmustergrund | null
}

export const AUSMUSTERGRUENDE = ['defekt', 'verloren', 'verkauft', 'ersetzt'] as const
export type Ausmustergrund = (typeof AUSMUSTERGRUENDE)[number]

/** Stand eines Schadens. */
export type SchadenStand = 'offen' | 'in_arbeit' | 'erledigt'

/** Eintrag im Verlauf: MFK, Service, Prüfung, Schaden, Übergabe … */
export interface Eintrag {
  id: string
  art: string
  datum: string
  km: number | null
  kosten_rappen: number | null
  ergebnis: 'ok' | 'maengel' | null
  naechste_am: string | null
  text: string | null
  person: string | null
  erstellt_am: string
  liter: number | null
  stand: SchadenStand | null
  erledigung: string | null
  erledigt_am: string | null
}

/** Offener Schaden mit Bezug (für «Zu erledigen» und die Akte). */
export interface Schaden extends Eintrag {
  fahrzeug_id: string | null
  geraet_id: string | null
}

/** Eine Frist aus der Sicht `fristen` (alle Bereiche). */
export interface Frist {
  art: 'mfk' | 'service' | 'pruefung' | 'ausweis' | 'reifen' | 'vignette' | 'leasing' | 'ausleihe'
  bezug_tabelle: 'fahrzeuge' | 'geraete' | 'qualifikationen'
  bezug_id: string
  titel: string
  faellig_am: string
  person_id: string | null
  standort_id: string | null
}

/** Stand einer Frist: vorbei, innerhalb des Vorlaufs oder später. */
export type FristStand = 'ueberfaellig' | 'bald' | 'ok'

/** Person oder Standort für Auswahlfelder. */
export interface Wahl {
  id: string
  name: string
}

/** Eine Zeile der Belegung: Reservierung (von Hand, Werkstatt, Einsatz) oder Fahrzeug, das dem Team folgt. */
export interface Belegung {
  quelle: 'hand' | 'auto'
  reservierung_id: string | null
  fahrzeug_id: string | null
  geraet_id: string | null
  von: string
  bis: string
  art: 'hand' | 'werkstatt' | 'einsatz'
  einsatz_id: string | null
  projekt_id: string | null
  person_id: string | null
  zweck: string | null
  projekt: string | null
}

/** Kosten eines Fahrzeugs in einem Jahr (aus `fuhrpark_kosten`). */
export interface FahrzeugKosten {
  fahrzeug_id: string
  bezeichnung: string
  kennzeichen: string
  km: number
  liter: number
  leasing_rappen: number
  treibstoff_rappen: number
  unterhalt_rappen: number
  fix_rappen: number
  uebrige_rappen: number
  privatanteil_rappen: number | null
}

/** Kosten aller Fahrzeuge und der Geräte in einem Jahr. */
export interface Kosten {
  jahr: number
  fahrzeuge: FahrzeugKosten[]
  geraete_wert_rappen: number
  geraete_kosten_rappen: number
}

/** Datei in der Ablage eines Fahrzeugs, Geräts oder Eintrags. */
export interface Datei {
  name: string
  pfad: string
  groesse: number | null
}

export const ANSICHTEN = ['erledigen', 'fahrzeuge', 'geraete', 'belegung', 'fristen', 'kosten'] as const
export type Ansicht = (typeof ANSICHTEN)[number]

/** Neuer Eintrag aus dem Formular; Fahrzeug oder Gerät. */
export interface NeuerEintrag {
  fahrzeug_id: string | null
  geraet_id: string | null
  art: string
  datum: string
  km: number | null
  kosten_rappen: number | null
  ergebnis: 'ok' | 'maengel' | null
  naechste: string | null
  text: string | null
  liter?: number | null
}
