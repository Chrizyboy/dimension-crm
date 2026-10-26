import { verkleinern } from '@/lib/bild'
import { supabase } from '@/services/supabase'
import type { Mitglied, PersonalAkte, Qualifikation } from '../types'

/**
 * Datenzugriff für Team, Ausweise und Personal-Akte. Wer was sehen und ändern darf, prüft die Datenbank:
 * Ausweise lesen alle, ändern die Administration oder die Person selbst; die Akte nur diese beiden.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Aktive Personen mit Rolle, nach Name. */
export async function ladeTeam(): Promise<Mitglied[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name, rolle, standort_id, rolle_info:rollen(name_de, name_fr)')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data.map(({ rolle_info, ...p }) => ({
    ...p,
    rolle_de: rolle_info.name_de,
    rolle_fr: rolle_info.name_fr,
  }))
}

/** Alle Ausweise (ohne Papierkorb). */
export async function ladeAusweise(): Promise<Qualifikation[]> {
  const { data, error } = await db()
    .from('qualifikationen')
    .select('id, person_id, art, bezeichnung, erworben_am, gueltig_bis, aussteller, datei_pfad, notiz')
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

/** Personal-Akte einer Person (null, wenn noch keine oder nicht sichtbar). */
export async function ladeAkte(personId: string): Promise<PersonalAkte | null> {
  const { data, error } = await db().from('personal_akten_sicht').select('*').eq('person_id', personId).maybeSingle()
  if (error) throw error
  return data as PersonalAkte | null
}

/** Personal-Akte speichern: anlegen beim ersten Mal, sonst ändern. Felder der Administration schützt die Datenbank. */
export async function akteSpeichern(a: Omit<PersonalAkte, 'id'>, id: string | null): Promise<void> {
  const { error } = id
    ? await db().from('personal_akten').update(a).eq('id', id)
    : await db().from('personal_akten').insert(a)
  if (error) throw error
}
