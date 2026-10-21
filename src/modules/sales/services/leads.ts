import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { LeadEingabe } from '../schema'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Was das PLZ-Verzeichnis zu einer PLZ weiss: Ort, Kanton, zuständiger Standort, Sprache, Lage, Höhe. */
export interface PlzAuskunft {
  plz: string
  ort: string
  kanton: string
  standort: 'muri' | 'bulle' | null
  sprache: 'de' | 'fr'
  breite: number
  laenge: number
  hoehe: number | null
}

/** Auskunft zu einer PLZ; null, wenn sie nicht im Verzeichnis steht. */
export async function plzAuskunft(plz: string): Promise<PlzAuskunft | null> {
  const { data, error } = await db().rpc('plz_auskunft', { p_plz: plz })
  if (error) throw error
  const z = data[0]
  if (!z?.plz) return null
  return {
    plz: z.plz,
    ort: z.ort,
    kanton: z.kanton,
    standort: z.standort === 'muri' || z.standort === 'bulle' ? z.standort : null,
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    breite: z.breite,
    laenge: z.laenge,
    hoehe: z.hoehe,
  }
}

/** Vorschläge beim Tippen: «56» → alle PLZ ab 56…, «Mur» → Orte, die so beginnen (auch Ortsteile). */
export async function plzVorschlaege(text: string): Promise<{ plz: string; ort: string }[]> {
  const t = text.trim().toLowerCase()
  if (t.length < 2) return []
  const nachZahl = /^\d+$/.test(t)
  const abfrage = db().from('plz_ortschaften').select('plz, ort').limit(8)
  const { data, error } = nachZahl
    ? await abfrage.like('plz', `${t}%`).order('plz')
    : await abfrage.like('ort_name', `${t.replace(/[%_]/g, '')}%`).order('ort')
  if (error) throw error
  return data
}

/** Mögliche Dubletten zu Name, Mail oder Telefon (dieselbe Prüfung wie beim Kontakt). */
export async function pruefeLeadDubletten(e: Pick<LeadEingabe, 'vorname' | 'nachname' | 'email' | 'telefon'>) {
  const { data, error } = await db().rpc('moegliche_dubletten', {
    p_name: `${e.vorname} ${e.nachname}`.trim(),
    p_email: e.email,
    p_telefon: e.telefon,
  })
  if (error) throw error
  return data
}

/**
 * Neuen Lead anlegen: neuer oder bestehender Kontakt, Gebäude und Verkaufschance in einem Schritt.
 * Nummer, Standort und Sprache ergänzt die Datenbank aus der PLZ.
 */
export async function legeLeadAn(e: LeadEingabe, kontaktId: string | null): Promise<string> {
  const { data, error } = await db().rpc('lead_anlegen', {
    p: {
      ...(kontaktId ? { kontakt_id: kontaktId } : {}),
      kontakt: {
        anrede: e.anrede,
        vorname: e.vorname,
        nachname: e.nachname,
        email: e.email,
        telefon: e.telefon,
        ...(e.sprache ? { sprache: e.sprache } : {}),
      },
      objekt: { strasse: e.strasse, plz: e.plz, ort: e.ort, gebaeudeart: e.gebaeudeart, dachform: e.dachform },
      lead: {
        quelle: e.quelle,
        eingang_am: e.eingangAm,
        ...(e.standortId ? { standort_id: e.standortId } : {}),
        ...(e.regionId ? { region_id: e.regionId } : {}),
        ...(e.personId ? { tour_person_id: e.personId } : {}),
        interesse: e.interesse,
        erreichbarkeit: e.erreichbarkeit,
        kommentar_kunde: e.kommentar,
        notiz_intern: e.notiz,
      },
    } as unknown as Json,
  })
  if (error) throw error
  return data
}

/** Felder eines Leads, die in der Lead-Akte direkt geändert werden. */
export interface LeadFelder {
  tour_person_id?: string | null
  region_id?: string | null
  standort_id?: string | null
  quelle?: string | null
  interesse?: string[]
  erreichbarkeit?: string | null
  finanzierung?: string | null
  zeithorizont?: string | null
  foerderung?: string | null
  kommentar_kunde?: string | null
  notiz_intern?: string | null
  besichtigung?: Json
}

/** Ändert einzelne Felder eines Leads; das Protokoll schreibt die Datenbank. */
export async function aendereLead(id: string, felder: LeadFelder): Promise<void> {
  const { error } = await db().from('verkaufschancen').update(felder).eq('id', id)
  if (error) throw error
}

/** Ändert viele Leads auf einmal (Mehrfachauswahl in der Liste). */
export async function aendereLeads(ids: readonly string[], felder: LeadFelder): Promise<void> {
  if (!ids.length) return
  const { error } = await db().from('verkaufschancen').update(felder).in('id', ids)
  if (error) throw error
}

/** Region mit ihrem Standort, für Filter, Heatmap und «Tour / Region». */
export interface Region {
  id: string
  nummer: number | null
  name: string
  standortId: string | null
}

/** Alle Regionen (Konfiguration als Daten, Regel 8). */
export async function ladeRegionen(): Promise<Region[]> {
  const { data, error } = await db()
    .from('regionen')
    .select('id, nummer, name, standort_id')
    .is('geloescht_am', null)
    .order('nummer')
  if (error) throw error
  return data.map((r) => ({ id: r.id, nummer: r.nummer, name: r.name, standortId: r.standort_id }))
}

/** Die beiden Standorte mit Adresse und Lage, als Start oder Ziel der Route. */
export async function ladeStandorte() {
  const { data, error } = await db()
    .from('standorte')
    .select('id, kuerzel, name, strasse, plz, ort')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Aktivitäten eines Leads (Kontaktverlauf), neueste zuerst. */
export async function ladeLeadVerlauf(verkaufschanceId: string) {
  const { data, error } = await db()
    .from('aktivitaeten')
    .select('id, art, richtung, zeitpunkt, text, ergebnis, person_id, personen(name)')
    .eq('verkaufschance_id', verkaufschanceId)
    .is('geloescht_am', null)
    .order('zeitpunkt', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

/** Die Felder eines Leads, die die Pipeline-Ansicht nicht mitbringt (Finanzierung, Besichtigung …). */
export async function ladeLeadDetails(verkaufschanceId: string) {
  const { data, error } = await db()
    .from('verkaufschancen')
    .select(
      'finanzierung, zeithorizont, foerderung, notiz_intern, besichtigung, verlauf_text, standort_id, tour_person_id',
    )
    .eq('id', verkaufschanceId)
    .single()
  if (error) throw error
  return data
}

/** Dateien zu einem Lead (Fotos, Pläne, Stromrechnung). */
export async function ladeLeadDateien(verkaufschanceId: string) {
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name, mime_typ, bytes, ordner, hochgeladen_am, erstellt_am, sharepoint_url, speicher_pfad')
    .eq('bezug_tabelle', 'verkaufschancen')
    .eq('bezug_id', verkaufschanceId)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Luftbild für das Terminblatt beim Lead ablegen (V233: Screenshot aus Google Maps einfügen),
 * damit es beim nächsten Druck schon da ist. Ältere Luftbilder bleiben in den Dateien.
 */
export async function speichereLuftbild(verkaufschanceId: string, bild: Blob): Promise<void> {
  const pfad = `verkaufschancen/${verkaufschanceId}/luftbild-${Date.now()}.jpg`
  const hoch = await db().storage.from('dokumente').upload(pfad, bild, { contentType: 'image/jpeg' })
  if (hoch.error) throw hoch.error
  const { error } = await db().from('dokumente').insert({
    name: 'Luftbild',
    mime_typ: 'image/jpeg',
    bytes: bild.size,
    ordner: 'luftbild',
    speicher: 'intern',
    speicher_pfad: pfad,
    bezug_tabelle: 'verkaufschancen',
    bezug_id: verkaufschanceId,
  })
  if (error) throw error
}
