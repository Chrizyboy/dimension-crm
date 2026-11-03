import { verkleinern } from '@/lib/bild'
import { supabase } from '@/services/supabase'
import type { Qualifikation } from '../types'

/**
 * Datenzugriff für Team, Ausweise und Personal-Akte. Wer was sehen und ändern darf, prüft die Datenbank:
 * Ausweise lesen alle, ändern die Administration oder die Person selbst; die Akte nur diese beiden.
 */
export function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alle Ausweise (ohne Papierkorb). */
export async function ladeAusweise(): Promise<Qualifikation[]> {
  const { data, error } = await db()
    .from('qualifikationen')
    .select('id, person_id, art, bezeichnung, erworben_am, gueltig_bis, aussteller, datei_pfad, notiz, kurs_id')
    .is('geloescht_am', null)
    .order('gueltig_bis', { ascending: false, nullsFirst: true })
  if (error) throw error
  return data
}

/** Ausweis anlegen (ohne id) oder ändern. */
export async function ausweisSpeichern(a: Omit<Qualifikation, 'id'>, id?: string): Promise<string> {
  if (id) {
    const { error } = await db().from('qualifikationen').update(a).eq('id', id)
    if (error) throw error
    return id
  }
  const { data, error } = await db().from('qualifikationen').insert(a).select('id').single()
  if (error) throw error
  return data.id
}

/** Ausweis in den Papierkorb. */
export async function ausweisEntfernen(id: string): Promise<void> {
  const { error } = await db().from('qualifikationen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Kursbestätigung oder Ausweis-Kopie in den privaten Speicher «personal», Ordner = Person. Gibt den Pfad zurück. */
export async function dateiHochladen(personId: string, datei: File): Promise<string> {
  const bild = datei.type.startsWith('image/')
  const blob = bild ? await verkleinern(datei) : datei
  const name = (bild ? datei.name.replace(/\.[^.]+$/, '') + '.jpg' : datei.name).replace(/[^\w.-]+/g, '_')
  const pfad = `${personId}/${String(Date.now())}-${name}`
  const { error } = await db()
    .storage.from('personal')
    .upload(pfad, blob, { contentType: bild ? blob.type || 'image/jpeg' : datei.type || 'application/pdf' })
  if (error) throw error
  return pfad
}

/** Kurz gültige Adresse zum Ansehen einer Datei. */
export async function dateiAdresse(pfad: string): Promise<string> {
  const { data, error } = await db().storage.from('personal').createSignedUrl(pfad, 300)
  if (error) throw error
  return data.signedUrl
}

/** Rollen für die Anforderungen (Pflicht-Ausweise je Rolle), ohne die reine System-Rolle Administration. */
export async function ladeRollen(): Promise<{ schluessel: string; name_de: string; name_fr: string }[]> {
  const { data, error } = await db()
    .from('rollen')
    .select('schluessel, name_de, name_fr')
    .is('geloescht_am', null)
    .eq('aktiv', true)
    .neq('schluessel', 'admin')
    .order('reihenfolge')
  if (error) throw error
  return data
}

/** Was eine Person bei sich hat (aus Fahrzeuge & Geräte), mit nächster Frist. */
export interface AusruestungTeil {
  id: string
  art: 'fahrzeug' | 'geraet'
  text: string
  frist: string | null
}

/** Fahrzeuge und Geräte, die der Person zugeteilt sind (ausser Betrieb ausgenommen). */
export async function ladeAusruestung(personId: string): Promise<AusruestungTeil[]> {
  const [f, g] = await Promise.all([
    db()
      .from('fahrzeuge')
      .select('id, bezeichnung, kennzeichen, naechste_mfk')
      .eq('person_id', personId)
      .eq('ausser_betrieb', false)
      .is('geloescht_am', null),
    db()
      .from('geraete')
      .select('id, bezeichnung, inventar_nr, naechste_pruefung, zustand')
      .eq('person_id', personId)
      .neq('zustand', 'ausser_betrieb')
      .is('geloescht_am', null),
  ])
  if (f.error) throw f.error
  if (g.error) throw g.error
  return [
    ...f.data.map((x) => ({
      id: x.id,
      art: 'fahrzeug' as const,
      text: `${x.bezeichnung} ${x.kennzeichen}`,
      frist: x.naechste_mfk,
    })),
    ...g.data.map((x) => ({
      id: x.id,
      art: 'geraet' as const,
      text: x.inventar_nr ? `${x.bezeichnung} (${x.inventar_nr})` : x.bezeichnung,
      frist: x.naechste_pruefung,
    })),
  ]
}
