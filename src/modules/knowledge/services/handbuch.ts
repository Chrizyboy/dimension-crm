import { dokumentAdresse } from '@/services/dokumente'
import { supabase } from '@/services/supabase'
import type { HandbuchDatei, HandbuchEingabe, HandbuchEintrag } from '../types'

/**
 * Datenzugriff für Prozesse und Videos. Lesen dürfen alle, ablegen und entfernen nur die Administration;
 * das prüft die Datenbank (`handbuch_speichern`, `handbuch_entfernen`).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const DATEI = 'id, name, mime_typ, bytes, speicher_pfad, sharepoint_url'
const FELDER =
  'id, art, titel_de, titel_fr, beschreibung_de, beschreibung_fr, version, datum, dauer_s, reihenfolge, sprache, ' +
  'versionen, erstellt_am, geaendert_am, ' +
  `datei_de:dokumente!handbuch_eintraege_datei_de_id_fkey(${DATEI}), ` +
  `datei_fr:dokumente!handbuch_eintraege_datei_fr_id_fkey(${DATEI}), ` +
  `vorschaubild:dokumente!handbuch_eintraege_vorschaubild_id_fkey(${DATEI})`

/** Alle Prozesse und Videos, die nicht im Papierkorb sind. */
export async function ladeHandbuch(): Promise<HandbuchEintrag[]> {
  const { data, error } = await db().from('handbuch_eintraege').select(FELDER).is('geloescht_am', null)
  if (error) throw error
  return data as unknown as HandbuchEintrag[]
}

/** Dateien früherer Versionen (nur die Angaben, nicht der Inhalt). */
export async function ladeDateien(ids: string[]): Promise<HandbuchDatei[]> {
  if (!ids.length) return []
  const { data, error } = await db().from('dokumente').select(DATEI).in('id', ids)
  if (error) throw error
  return data
}

/** Datei in den privaten Speicher legen und als Dokument im Ordner «handbuch» eintragen. */
export async function dateiAblegen(datei: Blob, name: string): Promise<string> {
  const typ = datei.type || 'application/octet-stream'
  const pfad = `handbuch/${crypto.randomUUID()}-${name.replace(/[^\w.-]+/g, '_')}`
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: typ })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: typ,
      bytes: datei.size,
      ordner: 'handbuch',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'handbuch_eintraege',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Zusätzliche Angaben zu einem Video, die der Browser beim Hochladen ausliest. */
export interface VideoAngaben {
  dauer_s: number | null
  vorschaubild: Blob | null
}

/**
 * Prozess oder Video speichern: erst die Dateien hochladen, dann `handbuch_speichern`. Bei einem Prozess mit
 * neuer Datei legt die Datenbank die bisherige Fassung unter «Frühere Versionen» ab.
 */
export async function speichereEintrag(e: HandbuchEingabe, video?: VideoAngaben): Promise<string> {
  const de = e.datei_de ? await dateiAblegen(e.datei_de, e.datei_de.name) : null
  const fr = e.datei_fr ? await dateiAblegen(e.datei_fr, e.datei_fr.name) : null
  const bild = video?.vorschaubild ? await dateiAblegen(video.vorschaubild, 'vorschau.jpg') : null
  const { data, error } = await db().rpc('handbuch_speichern', {
    p_id: e.id as string,
    p_art: e.art,
    p_titel_de: e.titel_de,
    p_beschreibung_de: e.beschreibung_de,
    p_titel_fr: e.titel_fr,
    p_beschreibung_fr: e.beschreibung_fr,
    p_version: e.version,
    p_datum: e.datum as string,
    p_datei_de_id: de as string,
    p_datei_fr_id: fr as string,
    ...(e.sprache ? { p_sprache: e.sprache } : {}),
    ...(e.reihenfolge !== null ? { p_reihenfolge: e.reihenfolge } : {}),
    ...(video?.dauer_s ? { p_dauer_s: video.dauer_s } : {}),
    ...(bild ? { p_vorschaubild_id: bild } : {}),
  })
  if (error) throw error
  return data
}

/** In den Papierkorb; die Datei bleibt im Speicher. */
export async function entferneEintrag(id: string): Promise<void> {
  const { error } = await db().rpc('handbuch_entfernen', { p_id: id })
  if (error) throw error
}

/** Kurz gültige Adresse zum Öffnen oder Abspielen. */
export async function dateiAdresse(d: HandbuchDatei): Promise<string | null> {
  return dokumentAdresse(d)
}
