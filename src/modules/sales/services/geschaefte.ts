import { supabase } from '@/services/supabase'
import type { Database, Json } from '@/types/datenbank'
import type { Aussendienst, Geschaeft, StandAngaben } from '../types'
import { alleSeiten } from '@/services/seiten'

type Zeile = Database['public']['Views']['verkauf_geschaefte']['Row']

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

function standortVon(s: string | null): 'muri' | 'bulle' | null {
  return s === 'muri' || s === 'bulle' ? s : null
}

/** Wandelt eine Zeile der Ansicht in die App-Form (die Ansicht liefert alles als «vielleicht leer»). */
export function geschaeftAusZeile(z: Zeile): Geschaeft {
  const art = z.art === 'offerten' || z.art === 'projekte' ? z.art : 'verkaufschancen'
  return {
    id: z.id ?? '',
    art,
    verkaufschanceId: z.verkaufschance_id,
    offerteId: z.offerte_id,
    projektId: z.projekt_id,
    nummer: z.lead_nummer ?? z.offerte_nummer ?? z.projekt_nummer ?? '',
    offerteNummer: z.offerte_nummer,
    kontaktId: z.kontakt_id ?? '',
    kundennummer: z.kundennummer ?? 0,
    name: z.name ?? '–',
    telefon: z.telefon,
    email: z.email,
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    werbesperre: z.werbesperre ?? false,
    objektId: z.objekt_id,
    strasse: z.strasse,
    plz: z.plz,
    ort: z.ort,
    breite: z.breite,
    laenge: z.laenge,
    lageGenau: z.lage_genau ?? false,
    hoehe: z.hoehe,
    standort: standortVon(z.standort),
    regionId: z.region_id,
    personId: z.person_id,
    terminPersonId: z.termin_person_id,
    stufe: z.stufe,
    offerteStatus: z.offerte_status,
    quelle: z.quelle,
    eingangAm: z.eingang_am,
    terminAm: z.termin_am,
    terminDauerMin: z.termin_dauer_min,
    wiedervorlageAm: z.wiedervorlage_am,
    wiedervorlageGrund: z.wiedervorlage_grund,
    verlustgrund: z.verlustgrund,
    erreichbarkeit: z.erreichbarkeit,
    interesse: z.interesse ?? [],
    kommentarKunde: z.kommentar_kunde,
    angebotAm: z.angebot_am,
    nachfassenAm: z.nachfassen_am,
    vertagtGrund: z.vertagt_grund,
    wertRappen: z.wert_rappen,
    kwp: z.kwp,
    stand: z.stand ?? 'lead_neu',
    standRang: z.stand_rang ?? 0,
    gruppe: z.gruppe ?? 'lead',
    standDatum: z.stand_datum,
    letzterKontakt: z.letzter_kontakt,
    geaendertAm: z.geaendert_am,
    suchtext: z.suchtext ?? '',
    telefonZiffern: z.telefon_ziffern ?? '',
  }
}

/** Alle Geschäfte. Gefiltert wird in der App, damit Kanban, Liste und Karte sofort reagieren. */
export async function ladeGeschaefte(): Promise<Geschaeft[]> {
  const data = await alleSeiten((von, bis) =>
    db().from('verkauf_geschaefte').select('*').order('art').order('id').range(von, bis),
  )
  return data.map(geschaeftAusZeile)
}

/** Ein einzelnes Geschäft, z. B. für die Lead-Akte nach einem Link. */
export async function ladeGeschaeft(id: string): Promise<Geschaeft | null> {
  const { data, error } = await db().from('verkauf_geschaefte').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? geschaeftAusZeile(data) : null
}

/** Stand eines Geschäfts setzen; die Regeln (Pflichtangaben, erlaubte Wechsel) prüft die Datenbank. */
export async function setzeStand(id: string, ziel: string, angaben: StandAngaben = {}): Promise<void> {
  const { error } = await db().rpc('setze_stand', {
    p_geschaeft: id,
    p_ziel: ziel,
    p_angaben: angaben as unknown as Json,
  })
  if (error) throw error
}

/** Kontakt mit einem Lead erfassen; das Ergebnis führt den Lead nach (V152). */
export async function erfasseKontakt(eingabe: {
  verkaufschanceId: string
  art: string
  richtung: 'ein' | 'aus' | null
  ergebnis: string | null
  text: string
  angaben: StandAngaben
}): Promise<void> {
  const { error } = await db().rpc('lead_kontakt_erfassen', {
    p_verkaufschance: eingabe.verkaufschanceId,
    p_art: eingabe.art,
    ...(eingabe.richtung ? { p_richtung: eingabe.richtung } : {}),
    ...(eingabe.ergebnis ? { p_ergebnis: eingabe.ergebnis } : {}),
    p_text: eingabe.text,
    p_angaben: eingabe.angaben as unknown as Json,
  })
  if (error) throw error
}

/** Personen mit Kundenterminen, für «Termin bei», Tagesroute und Kalender. */
export async function ladeAussendienst(): Promise<Aussendienst[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, kuerzel, name, profil, standorte(kuerzel)')
    .eq('aussendienst', true)
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data.map((p) => {
    const profil = p.profil as Record<string, unknown>
    const text = (k: string) => (typeof profil[k] === 'string' ? profil[k] : '')
    const plz = text('plz')
    const vomProfil = text('standort').toLowerCase()
    return {
      id: p.id,
      kuerzel: p.kuerzel,
      name: p.name,
      vorname: p.name.split(' ')[0] ?? p.name,
      standort: standortVon(p.standorte?.kuerzel ?? vomProfil),
      heim: plz ? { strasse: text('strasse'), plz, ort: text('ort') } : null,
    }
  })
}
