import { supabase } from '@/services/supabase'
import type { Database, Json } from '@/types/datenbank'
import {
  WERKVERTRAG_STATUS,
  type AuftragsOfferte,
  type Tranche,
  type Werkvertrag,
  type WerkvertragStatus,
} from '../types'

type Zeile = Database['public']['Views']['werkvertraege_liste']['Row']

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

function standortVon(s: string | null): 'muri' | 'bulle' | null {
  return s === 'muri' || s === 'bulle' ? s : null
}

function tranchenAus(roh: Json | null): Tranche[] {
  if (!Array.isArray(roh)) return []
  return roh.flatMap((x) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return []
    const r = x as Record<string, unknown>
    return [
      {
        bezeichnung: typeof r.bezeichnung === 'string' ? r.bezeichnung : '',
        betragRappen: Number(r.betrag_rappen ?? 0),
        faelligAm: typeof r.faellig_am === 'string' ? r.faellig_am : null,
        bezahltAm: typeof r.bezahlt_am === 'string' ? r.bezahlt_am : null,
      },
    ]
  })
}

/** Zeile der Ansicht in die App-Form. */
export function vertragAusZeile(z: Zeile): Werkvertrag {
  const status = (WERKVERTRAG_STATUS as readonly string[]).includes(z.status ?? '')
    ? (z.status as WerkvertragStatus)
    : 'entwurf'
  return {
    id: z.id ?? '',
    nummer: z.nummer ?? '',
    status,
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    version: z.version ?? 1,
    betragRappen: z.betrag_rappen,
    erstelltDatum: z.erstellt_datum,
    versendetAm: z.versendet_am,
    unterschriebenAm: z.unterschrieben_am,
    notiz: z.notiz,
    offerteId: z.offerte_id,
    projektId: z.projekt_id,
    kontaktId: z.kontakt_id ?? '',
    name: z.name ?? '–',
    kundennummer: z.kundennummer ?? 0,
    anrede: z.anrede,
    vorname: z.vorname,
    nachname: z.nachname,
    kontaktFirma: z.kontakt_firma,
    email: z.email,
    telefon: z.telefon,
    kontaktAdresse: { strasse: z.kontakt_strasse, plz: z.kontakt_plz, ort: z.kontakt_ort },
    objekt: { strasse: z.objekt_strasse, plz: z.objekt_plz, ort: z.objekt_ort },
    firma: {
      name: z.firma_name,
      strasse: z.firma_strasse,
      plz: z.firma_plz,
      ort: z.firma_ort,
      mwstNr: z.firma_mwst_nr,
    },
    offerteNummer: z.offerte_nummer,
    angebotAm: z.angebot_am,
    titel: z.titel,
    kwp: z.leistung_kwp,
    anzahlModule: z.anzahl_module,
    wechselrichter: z.wechselrichter,
    batterie: z.batterie,
    baubeginn: z.baubeginn,
    kondition: z.zahlungskonditionen,
    standort: standortVon(z.standort),
    zahlungsplan: tranchenAus(z.zahlungsplan),
    suchtext: z.suchtext ?? '',
  }
}

/** Alle Werkverträge, neueste Nummer zuerst. */
export async function ladeVertraege(): Promise<Werkvertrag[]> {
  const { data, error } = await db().from('werkvertraege_liste').select('*').order('nummer', { ascending: false })
  if (error) throw error
  return data.map(vertragAusZeile)
}

/** Die Offerte für «Auftrag erstellen» (aus der gemeinsamen Offert-Ansicht der Datenbank). */
export async function ladeAuftragsOfferte(offerteId: string): Promise<AuftragsOfferte | null> {
  const { data, error } = await db()
    .from('offerten_liste')
    .select(
      'id, nummer, name, standort_id, standort, sprache, betrag_rappen, leistung_kwp, anzahl_module, batterie, status, projekt_id',
    )
    .eq('id', offerteId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id ?? offerteId,
    nummer: data.nummer ?? '',
    name: data.name ?? '–',
    standortId: data.standort_id,
    standort: standortVon(data.standort),
    sprache: data.sprache === 'fr' ? 'fr' : 'de',
    betragRappen: data.betrag_rappen,
    kwp: data.leistung_kwp,
    anzahlModule: data.anzahl_module,
    batterie: data.batterie,
    status: data.status ?? '',
    projektId: data.projekt_id,
  }
}

/** Standorte Muri und Bulle mit ihrer Firma und Sprache. */
export async function ladeStandorte(): Promise<{ id: string; kuerzel: string; name: string; sprache: string }[]> {
  const { data, error } = await db()
    .from('standorte')
    .select('id, kuerzel, name, sprache')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** «Auftrag erstellen» (V232): Projekt, Zahlungsplan und Werkvertrag in einem Schritt. */
export async function erstelleAuftrag(
  offerteId: string,
  a: {
    standort_id: string
    sprache: 'de' | 'fr'
    kondition: string
    vertragswert_rappen: number
    unterzeichnet_am: string
    werkvertrag: boolean
  },
): Promise<string> {
  const { data, error } = await db().rpc('auftrag_erstellen', { p_offerte: offerteId, p: a as Json })
  if (error) throw error
  return data
}

/** Stand des Werkvertrags: erstellt, versendet, unterschrieben (datum), storniert (grund). */
export async function setzeVertragStatus(
  id: string,
  ziel: WerkvertragStatus,
  angaben: { datum?: string; grund?: string } = {},
) {
  const { error } = await db().rpc('werkvertrag_status', { p_id: id, p_ziel: ziel, p: angaben as Json })
  if (error) throw error
}
