/** Typen für Projektleitung und GL (Baustellen heute, Akte, Wochenblatt, Auswertung) und die Baustellen-Mappe. */
import type { MaterialZeile, Unterschrift } from './types'
import type { MeldungArt, Schritt, Seriennummer, Sicherheit, TeamPerson } from './typenBaustelle'

/** Eine Person im Team auf «Baustellen heute», mit Stempel-Stand. */
export interface TeamStand extends TeamPerson {
  seit: string | null
  laeuft: boolean
}

/** Eine Baustelle mit Einsatz am Tag. */
export interface BaustelleHeute {
  einsatz_id: string
  projekt_id: string
  nummer: string
  standort_id: string | null
  kunde: string | null
  ort: string | null
  von: string
  bis: string
  notiz: string | null
  vorlage: string
  team: TeamStand[]
  schritte: Schritt[]
  erledigt: Record<string, string>
  fortschritt: number
  soll: number | null
  ist: number | null
  fotos: number
  fotos_heute: number
  meldungen: { id: string; art: MeldungArt; nummer: string }[]
  rapport: { id: string; nummer: string; abgeschlossen_am: string | null } | null
  rapport_gestern_fehlt: boolean
}

/** Offene Meldung (Liste). */
export interface MeldungZeile {
  id: string
  nummer: string
  art: MeldungArt
  text: string
  weiter: boolean
  erstellt_am: string
  projekt_id: string | null
  projekt_nummer: string | null
  kunde: string | null
  person: string | null
  fotos_anzahl: number
  erledigt_am?: string | null
  erledigt_notiz?: string | null
  erledigt_von_name?: string | null
}

/** Antwort von `baustellen_heute`. */
export interface Heute {
  tag: string
  baustellen: BaustelleHeute[]
  kennzahlen: {
    baustellen: number
    personen: number
    gestempelt: number
    meldungen: number
    rapporte_fehlen: number
    zeiten_pruefen: number
    nachtraege_rappen: number
    nachtraege_ohne_preis: number
  }
  meldungen: MeldungZeile[]
  zu_visieren: {
    id: string
    nummer: string
    art: string
    datum: string
    kunde: string | null
    projekt_nummer: string | null
    person: string | null
    rueckfrage: string | null
  }[]
}

/** Zeile der Baustellen-Liste. */
export interface BaustelleZeile {
  projekt_id: string
  nummer: string
  bau_status: string | null
  standort_id: string | null
  kunde: string | null
  ort: string | null
  von: string
  bis: string
  vorlage: string
  fortschritt: number
  soll: number | null
  ist: number | null
  meldungen: number
  rapporte: number
}

/** Rapport im Bautagebuch der Akte. */
export interface TagebuchRapport {
  id: string
  nummer: string
  art: string
  datum: string
  person: string | null
  arbeiten: string | null
  abgeschlossen_am: string | null
  visiert_am: string | null
  rueckfrage: string | null
  stunden: number | null
  fotos_anzahl: number
  material: MaterialZeile[]
  schritte: Record<string, boolean>
  seriennummern: Seriennummer[]
  vorbehalte: { text: string }[]
  sicherheit: Sicherheit | null
  montage_fertig: boolean
  unterschrift_kunde: Unterschrift | null
}

/** Antwort von `baustelle_akte`. */
export interface BaustellenAkte {
  projekt: {
    id: string
    nummer: string
    titel: string | null
    status: string
    bau_status: string | null
    elektriker: string | null
    soll_stunden: number | null
    kunde: string | null
    telefon: string | null
    strasse: string | null
    plz: string | null
    ort: string | null
    pl: string | null
    vorlage: string
    speicher: boolean
    kwp: number | null
  }
  einsaetze: { id: string; von: string; bis: string; art: string; notiz: string | null; team: string[] }[]
  schritte: Schritt[]
  erledigt: Record<string, string>
  fortschritt: number
  fotos_pflicht: Schritt[]
  stunden: { soll: number | null; quelle: 'hand' | 'regel' | null; arbeit: number; reise: number }
  rapporte: TagebuchRapport[]
  meldungen: MeldungZeile[]
  nachtraege: {
    id: string
    nummer: string
    beschreibung: string
    stunden: number | null
    betrag_rappen: number | null
    status: string
  }[]
  material: { zeilen: number; fehlt: number }
  fotos: {
    id: string
    name: string
    kategorie: string | null
    speicher_pfad: string | null
    sharepoint_url: string | null
    datum: string
    rapport_nummer: string
  }[]
  anlage: { id: string; komponenten: { art?: string; modell?: string | null; seriennummer?: string }[] } | null
}

/** Ein Tag im Wochenblatt. */
export interface WochenTag {
  tag: string
  stunden: number
  pause_min: number
  laeuft: boolean
  ungeprueft: number
  abwesenheit: { art: string; halbtag: boolean } | null
  einsatz: boolean
}

/** Eine Person im Wochenblatt. */
export interface WochenPerson {
  person_id: string
  name: string
  kuerzel: string | null
  standort_id: string | null
  pensum: number
  tage: WochenTag[]
  saldo_jahr: number
  bestaetigt_am: string | null
}

/** Antwort von `zeiten_wochenblatt`. */
export interface Wochenblatt {
  woche: string
  woche_soll_h: number
  personen: WochenPerson[]
}

/** Fertige Baustelle in der Auswertung. */
export interface FertigeBaustelle {
  projekt_id: string
  nummer: string
  datum: string
  kunde: string | null
  ort: string | null
  vorlage: string
  dachform: string | null
  kwp: number | null
  soll: number | null
  ist: number | null
  reise: number | null
  meldungen: number
}

/** Antwort von `baustelle_auswertung`. */
export interface Auswertung {
  fertig: FertigeBaustelle[]
  stunden: { arbeit: number; reise: number; auf_projekt: number }
  nachtraege: { anzahl: number; rappen: number }
  meldungen: Partial<Record<MeldungArt, number>>
  rapporte: { anzahl: number; gleicher_tag: number; visiert: number }
}

/** Antwort von `baustellen_mappe` (wird am Handy abgelegt). */
export interface Mappe {
  projekt: { id: string; nummer: string; titel: string | null; bau_status: string | null; vorlage: string }
  anlage: {
    kwp: number | null
    module: number | null
    wechselrichter: string | null
    batterie: string | null
    komponenten: { art?: string; modell?: string | null; seriennummer?: string }[] | null
  }
  dach: { dachform: string | null; gebaeudeart: string | null; details: Record<string, unknown> | null }
  adresse: {
    strasse: string | null
    plz: string | null
    ort: string | null
    breite: number | null
    laenge: number | null
  }
  hinweise: { von: string; bis: string; text: string }[]
  dokumente: {
    id: string
    name: string
    ordner: string | null
    mime_typ: string | null
    speicher: string
    speicher_pfad: string | null
    sharepoint_url: string | null
  }[]
  kontakte: { rolle: string; name: string | null; telefon?: string | null; email?: string | null }[]
  material: {
    id: string
    bezeichnung: string
    menge: number
    einheit: string
    artikelnummer: string | null
    vorhanden: number
    fehlt: number
    unterwegs: number
  }[]
  meldungen: { id: string; nummer: string; art: MeldungArt; text: string; erstellt_am: string }[]
}
