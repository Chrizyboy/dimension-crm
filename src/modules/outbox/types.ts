/** Fachliche Typen des Moduls «Ausgangskorb». */

/** Wo ein Eintrag steht: wartet auf Freigabe, ist freigegeben, wird gerade gesendet, ist raus … */
export type AusgangStatus = 'wartet' | 'freigegeben' | 'wird_gesendet' | 'gesendet' | 'fehler' | 'verworfen'

/** Kanal: Mail und SMS sendet der Server, Briefe druckt ein Mensch und markiert sie als versendet. */
export type AusgangKanal = 'mail' | 'sms' | 'brief'

/** Ein Eintrag im Ausgangskorb (Zeile der Sicht `ausgang_ansicht`). */
export interface AusgangEintrag {
  id: string
  kanal: AusgangKanal
  art: string
  an: string
  cc: string | null
  betreff: string | null
  text: string | null
  html: string | null
  status: AusgangStatus
  automatisch: boolean
  /** KI-Text einer Automation (Phase 13): wartet, fertig, fehler, uebersprungen. */
  ki_status: 'wartet' | 'fertig' | 'fehler' | 'uebersprungen' | null
  ki_auftrag: { vorlage_text?: string; meldung?: string } | null
  fehler: string | null
  verworfen_grund: string | null
  anhaenge: { dokument_id: string; name?: string }[]
  erstellt_am: string
  freigegeben_am: string | null
  gesendet_am: string | null
  /** Frühestens dann senden (geplant). */
  sende_ab: string | null
  /** Bis dann kann eine Freigabe noch zurückgeholt werden. */
  rueckgaengig_bis: string | null
  sprache: 'de' | 'fr'
  kontakt_id: string | null
  verkaufschance_id: string | null
  offerte_id: string | null
  projekt_id: string | null
  bezug_tabelle: string | null
  bezug_id: string | null
  absender_person_id: string | null
  /** Namen für die Anzeige. */
  absender: string | null
  freigegeben_durch: string | null
  vorbereitet_von: string | null
  zurueck_an: string | null
  zurueck_von: string | null
  zurueck_notiz: string | null
  zurueck_am: string | null
  verworfen_von: string | null
  ruecklauf_am: string | null
  kunde: string | null
  /** Darf ich freigeben (Recht je Art, Absender, Stellvertretung)? */
  darf_freigeben: boolean
  /** Bin ich dran (wartet oder Fehler, zurück an mich oder ich darf und es ist meins)? */
  fuer_mich: boolean
  /** Erste Antwort des Kunden nach dem Senden (aus dem Kundenverlauf). */
  antwort_am: string | null
}

/** Ordner links in der Werkbank. «team» = alles Offene des Teams, nicht nur meins. */
export const AUSGANG_ORDNER = [
  'fuer_mich',
  'fehler',
  'zurueck',
  'team',
  'geplant',
  'unterwegs',
  'gesendet',
  'verworfen',
] as const
export type AusgangOrdner = (typeof AUSGANG_ORDNER)[number]

/** Ein Prüfpunkt vor dem Senden (aus `ausgang_pruefen`). */
export interface AusgangPruefung {
  code: string
  stufe: 'ok' | 'warnung' | 'fehler'
  wert?: string | number | null
}

/** Zusammenhang eines Eintrags (aus `ausgang_kontext`). */
export interface AusgangKontext {
  kunde: {
    id: string
    nummer: string | null
    name: string | null
    sprache: string | null
    telefon: string | null
    email: string | null
  } | null
  lead: { id: string; nummer: string | null; stufe: string | null } | null
  offerte: {
    id: string
    nummer: string | null
    titel: string | null
    betrag_rappen: number | null
    status: string | null
  } | null
  projekt: { id: string; nummer: string | null; titel: string | null } | null
  rechnung: {
    id: string
    nummer: string | null
    total_rappen: number | null
    faellig_am: string | null
    mahnstufe: number | null
  } | null
  verlauf: { art: string; richtung: string | null; zeitpunkt: string; text: string; person: string | null }[]
}

/** Gruppe in der Liste: dringlich nach Alter, Serien (gleiche Art, mehrere Einträge) zusammen. */
export interface AusgangGruppe {
  schluessel: string
  /** i18n-Schlüssel oder fertiger Titel (Serie). */
  titel: string
  serie: boolean
  eintraege: AusgangEintrag[]
}
