import { supabase } from '@/services/supabase'
import type { Database, Json } from '@/types/datenbank'
import {
  WERKVERTRAG_STATUS,
  type Anzahlung,
  type AuftragsOfferte,
  type Tranche,
  type VertragAngaben,
  type Werkvertrag,
  type WerkvertragEinstellung,
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
      telefon: z.firma_telefon,
      email: z.firma_email,
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
    angaben: angabenAus(z.angaben),
    anzahlung: anzahlungAus(z.anzahlung),
  }
}

function objekt(roh: Json | null): Record<string, unknown> | null {
  return roh && typeof roh === 'object' && !Array.isArray(roh) ? roh : null
}

/** Angaben des Vertrags aus der Datenbank (jsonb), nur bekannte Felder. */
export function angabenAus(roh: Json | null): VertragAngaben {
  const a = objekt(roh) ?? {}
  const text = (k: string) => (typeof a[k] === 'string' ? a[k] : undefined)
  const o = objekt((a.optionen ?? null) as Json)
  const z = objekt((a.zahlung ?? null) as Json)
  const r: VertragAngaben = {}
  for (const k of ['gegenstand', 'material', 'beginn', 'fertig', 'ansprechperson'] as const) {
    const t = text(k)
    if (t) r[k] = t
  }
  if (o) {
    r.optionen = {
      monitoring: o.monitoring === true,
      wartung: o.wartung === true,
      ...(typeof o.divers === 'string' ? { divers: o.divers } : {}),
    }
  }
  if (z && typeof z.kondition === 'string') {
    r.zahlung = {
      kondition: z.kondition,
      ...(typeof z.anzahlung_rappen === 'number' ? { anzahlung_rappen: z.anzahlung_rappen } : {}),
    }
  }
  return r
}

function anzahlungAus(roh: Json | null): Anzahlung | null {
  const a = objekt(roh)
  if (!a) return null
  const s = (k: string) => (typeof a[k] === 'string' ? a[k] : null)
  return {
    betragRappen: Number(a.betrag_rappen ?? 0),
    rechnungNr: s('rechnung_nr'),
    rechnungId: s('rechnung_id'),
    rechnungStatus: s('rechnung_status'),
    bezahltAm: s('bezahlt_am'),
    abaninja: a.abaninja === true,
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
      'id, nummer, name, standort_id, standort, sprache, betrag_rappen, leistung_kwp, anzahl_module, batterie, status, projekt_id, ort, wechselrichter, titel',
    )
    .eq('id', offerteId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  // Bestehender Vertrag (für «Bearbeiten»): Angaben, Wert inkl. MWST, Datum der Unterzeichnung.
  const v = await db()
    .from('werkvertraege_liste')
    .select('angaben, betrag_rappen, status')
    .eq('offerte_id', offerteId)
    .neq('status', 'storniert')
    .order('erstellt_datum', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (v.error) throw v.error
  const p = data.projekt_id
    ? await db().from('projekte').select('unterzeichnet_am').eq('id', data.projekt_id).maybeSingle()
    : null
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
    ort: data.ort,
    wechselrichter: data.wechselrichter,
    titel: data.titel,
    vertrag: v.data
      ? {
          angaben: angabenAus(v.data.angaben),
          betragRappen: v.data.betrag_rappen,
          unterzeichnet: p?.data?.unterzeichnet_am ?? null,
        }
      : null,
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

/** «Auftrag erstellen» (V232): Projekt, Zahlungsplan und Werkvertrag in einem Schritt; gibt den Vertrag zurück. */
export async function erstelleAuftrag(
  offerteId: string,
  a: {
    standort_id: string
    sprache: 'de' | 'fr'
    kondition: string
    vertragswert_rappen: number
    unterzeichnet_am: string
    werkvertrag: boolean
    anzahlung_rappen?: number | null
    angaben?: VertragAngaben
  },
): Promise<string> {
  const { error } = await db().rpc('auftrag_erstellen', { p_offerte: offerteId, p: a as unknown as Json })
  if (error) throw error
  // Die Funktion gibt das Projekt zurück; die Akte braucht den Werkvertrag.
  const v = await db()
    .from('werkvertraege')
    .select('id')
    .eq('offerte_id', offerteId)
    .is('geloescht_am', null)
    .neq('status', 'storniert')
    .order('erstellt_am', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (v.error) throw v.error
  return v.data?.id ?? ''
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

/** Dateien zum Vertrag und zur Offerte (für den Mail-Versand), neueste zuerst. */
export async function ladeVertragDateien(w: Werkvertrag): Promise<{ id: string; name: string }[]> {
  const bezuege = [w.id, ...(w.offerteId ? [w.offerteId] : [])]
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name')
    .in('bezug_id', bezuege)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

const EINSTELLUNG_STANDARD: WerkvertragEinstellung = {
  unterzeichner: 'Erich Rosenberg',
  ansprechperson: '',
  telefon: null,
  email: null,
  adresse: '',
  kondition_pv: 'normal',
  kondition_batterie: '70_30',
}

/** Einstellung «werkvertrag» (Unterzeichner, Ansprechperson, Standard-Bedingungen). */
export async function ladeEinstellung(): Promise<WerkvertragEinstellung> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'werkvertrag').maybeSingle()
  if (error) throw error
  return { ...EINSTELLUNG_STANDARD, ...((data?.wert ?? {}) as Partial<WerkvertragEinstellung>) }
}

/** Einstellung ändern (nur Administration; die Datenbank prüft das). */
export async function speichereEinstellung(e: WerkvertragEinstellung): Promise<void> {
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: e as unknown as NonNullable<Json> })
    .eq('schluessel', 'werkvertrag')
  if (error) throw error
}

/** Anzahlungsrechnung zum Vertrag anlegen und stellen (oder die bestehende); gibt die Rechnungs-ID zurück. */
export async function anzahlungsrechnung(werkvertragId: string): Promise<string> {
  const { data, error } = await db().rpc('werkvertrag_anzahlungsrechnung', { p_werkvertrag: werkvertragId })
  if (error) throw error
  return data
}

/** Vertrags-PDF hochladen und beim Werkvertrag ablegen; gibt Dokument-ID und Dateiname zurück. */
export async function vertragPdfAblegen(w: Werkvertrag, bytes: Uint8Array): Promise<{ id: string; name: string }> {
  const name = `${w.sprache === 'fr' ? 'Contrat-entreprise' : 'Werkvertrag'}-${w.nummer}${w.version > 1 ? `-V${String(w.version)}` : ''}.pdf`
  const pfad = `werkvertraege/${w.id}/${String(Date.now())}-${name}`
  const hoch = await db()
    .storage.from('dokumente')
    .upload(pfad, new Blob([bytes as BlobPart], { type: 'application/pdf' }), { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'vertraege',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'werkvertraege',
      bezug_id: w.id,
    })
    .select('id')
    .single()
  if (error) throw error
  await db().from('werkvertraege').update({ dokument_id: data.id }).eq('id', w.id)
  return { id: data.id, name }
}
