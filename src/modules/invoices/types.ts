/** Fachliche Typen des Moduls «Rechnungen». Beträge immer in Rappen (Ganzzahl). */
import type { RechnungArt } from '@/types/rechnung'

export { RECHNUNG_ARTEN, RECHNUNG_STATUS } from '@/types/rechnung'
export type {
  Empfaenger,
  Firma,
  Position,
  Rechnung,
  RechnungAn,
  RechnungArt,
  RechnungStatus,
  RechnungVoll,
  Zahlung,
} from '@/types/rechnung'
/** Filter der Liste (V233: geplant/gestellt/überfällig/bezahlt). */
export const RECHNUNG_FILTER = [
  'offen',
  'ueberfaellig',
  'gemahnt',
  'nichtVersendet',
  'sperre',
  'entwuerfe',
  'bezahlt',
  'alle',
] as const
export type RechnungFilter = (typeof RECHNUNG_FILTER)[number]

/** Reiter der Seite. Ohne Recht «finanzen» nur «Meine Projekte» und «Eingangsrechnungen» (Visum). */
export const REITER = ['uebersicht', 'rechnungen', 'verrechnen', 'mahnlauf', 'eingang', 'projekte', 'firmen'] as const
export type Reiter = (typeof REITER)[number]
export const REITER_OHNE_FINANZEN: readonly Reiter[] = ['projekte', 'eingang']

/** Welche Reiter jemand sieht: mit Recht «finanzen» alle, sonst «Meine Projekte» und «Eingangsrechnungen». */
export function sichtbareReiter(finanzen: boolean): readonly Reiter[] {
  return finanzen ? REITER : REITER_OHNE_FINANZEN
}

/** Wann eine Tranche verrechnet werden darf (intern.tranche_meilenstein). */
export interface Meilenstein {
  erreicht: boolean
  grund: 'ibn' | 'montage' | 'vertrag' | 'baubeginn' | 'datum'
}

/** Tranche aus dem Zahlungsplan ohne Rechnung (Sicht offene_tranchen). */
export interface Tranche {
  id: string
  projekt_id: string
  projekt_nummer: string
  projekt_titel: string | null
  kontakt_id: string | null
  kunde: string | null
  bezeichnung: string
  betrag_rappen: number
  faellig_am: string | null
  bau_status: string | null
  meilenstein: Meilenstein
  verrechnen_ausgeloest_am: string | null
  ausgeloest_von: string | null
  projektleiter_id: string | null
  projektleiter: string | null
}

/** Kostenpflichtiger Rapport ohne Rechnung (Sicht offene_service_rapporte). */
export interface OffenerRapport {
  id: string
  nummer: string
  art: string
  datum: string
  kontakt_id: string | null
  kunde: string | null
  service_nummer: string | null
  service_titel: string | null
  projekt_nummer: string | null
}

/** Was «Neue Rechnung» an die Datenbank schickt (rechnung_entwurf). */
export interface EntwurfVorgabe {
  zahlungsplan_id?: string
  rapport_id?: string
  wartungsvertrag_id?: string
  projekt_id?: string
  kontakt_id?: string
  art?: RechnungArt
  prozent?: number
  titel?: string
}

/** Kennzahlen und «Heute zu tun» der Buchhaltung (rechnungen_uebersicht). */
export interface Uebersicht {
  offen_rappen: number
  offen_anzahl: number
  ueberfaellig_rappen: number
  ueberfaellig_anzahl: number
  erwartet_30_rappen: number
  gestellt_monat_rappen: number
  tage_bis_zahlung: number | null
  alter: Record<'nicht_faellig' | 'bis_30' | 'bis_60' | 'bis_90' | 'ueber_90', number>
  firmen: { name: string; offen_rappen: number; anzahl: number }[]
  groesste: { id: string; nummer: string; kunde: string; rest_rappen: number; tage: number; mahnstufe: number }[]
  entwuerfe: number
  entwuerfe_rappen: number
  ausgeloest: number
  mahnlauf: number
  mahnlauf_rappen: number
  nicht_versendet: number
  zusage_abgelaufen: number
  kleiner_rest: number
  zu_verrechnen: number
  zu_verrechnen_rappen: number
}

/** Vorschlag des Mahnlaufs je Rechnung (mahnlauf_vorschlag): Stufe 0 = Erinnerung, 1–3 = Mahnung. */
export interface MahnlaufZeile {
  rechnung_id: string
  nummer: string
  kunde: string
  kontakt_id: string
  email: string | null
  sprache: 'de' | 'fr'
  versandweg: 'mail' | 'post'
  projekt_nummer: string | null
  total_rappen: number
  offen_rappen: number
  faellig_am: string
  tage: number
  mahnstufe: number
  stufe: number
  aktion: 'senden' | 'ueberspringen' | 'betreibung'
  grund: 'klein' | 'sperre' | 'zusage' | 'unterwegs' | 'reklamation' | null
  mahnsperre_grund: string | null
  zusage_bis: string | null
}

/** Kurzstand einer Rechnung im Zahlungsstand der Projekte. */
export interface RechnungKurz {
  id: string
  nummer: string | null
  titel?: string
  status: string
  total_rappen: number
  offen_rappen: number
  faellig_am: string | null
  mahnstufe: number
  ueberfaellig: boolean
}

/** Zahlungsstand eines Projekts für Projektleitung und Verkauf (zahlungsstand_projekte, nur lesen). */
export interface ProjektStand {
  projekt_id: string
  nummer: string
  titel: string | null
  kunde: string | null
  status: string
  bau_status: string | null
  projektleiter_id: string | null
  ich_projektleiter: boolean
  vertragswert_rappen: number
  bezahlt_rappen: number
  offen_rappen: number
  ueberfaellig_rappen: number
  tranchen: {
    id: string
    bezeichnung: string
    betrag_rappen: number
    faellig_am: string | null
    bezahlt_am: string | null
    meilenstein: Meilenstein
    ausgeloest_am: string | null
    rechnung: RechnungKurz | null
  }[]
  andere: RechnungKurz[]
}

/** Eintrag im Verlauf einer Rechnung (rechnung_verlauf). */
export interface VerlaufEintrag {
  art:
    'notiz' | 'anruf' | 'mail' | 'zusage' | 'mahnsperre' | 'ausgebucht' | 'system' | 'zahlung' | 'versand' | 'gestellt'
  text: string | null
  wann: string
  wer?: string | null
  betrag_rappen?: number
  mail_art?: string
  status?: string
  an?: string
}

export const EINGANG_STATUS = ['neu', 'visum_pl', 'visum_gl', 'bereit', 'bezahlt', 'abgelehnt', 'storniert'] as const
export type EingangStatus = (typeof EINGANG_STATUS)[number]
export const EINGANG_FILTER = ['meine', 'offen', 'bereit', 'neu', 'bezahlt', 'abgelehnt', 'alle'] as const
export type EingangFilter = (typeof EINGANG_FILTER)[number]

/** Eingangsrechnung (Lieferant) mit Visa (Sicht eingangsrechnungen_liste). */
export interface Eingangsrechnung {
  id: string
  quelle: 'hand' | 'abaninja'
  lieferant: string
  nummer: string | null
  datum: string | null
  faellig_am: string | null
  betrag_rappen: number
  offen_rappen: number | null
  skonto_prozent: number | null
  skonto_bis: string | null
  projekt_id: string | null
  projekt_nummer: string | null
  projekt_titel: string | null
  kunde: string | null
  bestellung_id: string | null
  bestellung_nummer: string | null
  dokument_id: string | null
  text: string | null
  status: EingangStatus
  visum_pl_person_id: string | null
  visum_pl_person: string | null
  visum_pl_von: string | null
  visum_pl_von_name: string | null
  visum_pl_am: string | null
  visum_pl_bemerkung: string | null
  visum_gl_noetig: boolean
  visum_gl_von: string | null
  visum_gl_von_name: string | null
  visum_gl_am: string | null
  visum_gl_bemerkung: string | null
  abgelehnt_von_name: string | null
  abgelehnt_grund: string | null
  bezahlt_am: string | null
  erstellt_am: string
  ueberfaellig: boolean
  /** Wartet auf mein Visum (Datenbank rechnet wie eingang_visieren). */
  ich_visiere: boolean
}

/** Vergleich mit der Bestellung für das Visum (eingang_vergleich); Preise nur mit Recht «preise». */
export interface EingangVergleich {
  bestellung: null | {
    nummer: string
    status: string
    bestellt_am: string | null
    total_rappen: number | null
    differenz_rappen: number | null
    positionen: {
      bezeichnung: string
      menge: number
      einheit: string | null
      geliefert: number | null
      ek_rappen: number | null
    }[]
  }
}
