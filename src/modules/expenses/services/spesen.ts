import { verkleinern } from '@/lib/bild'
import { dokumentAdresse } from '@/services/dokumente'
import { supabase } from '@/services/supabase'
import type { NeueSpese, Spese } from '../types'

/**
 * Datenzugriff für Spesen. Wer was sehen und ändern darf, prüft die Datenbank: eigene Spesen jede Person,
 * alle nur mit Recht «finanzen»; ausbezahlte und stornierte bleiben fest (Storno statt Löschen).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Spesen der Person oder (personId null) alle, die die Datenbank zeigt; neueste zuerst. */
export async function ladeSpesen(personId: string | null): Promise<Spese[]> {
  let q = db().from('spesen_liste').select('*')
  if (personId) q = q.eq('person_id', personId)
  const { data, error } = await q
    .order('datum', { ascending: false })
    .order('erstellt_am', { ascending: false })
    .limit(3000)
  if (error) throw error
  return data as unknown as Spese[]
}

/**
 * Spese erfassen, mit Beleg: zuerst die Spese, dann der Beleg (Fotos verkleinert) in den Ablage-Ordner
 * «spesen» und an die Spese gehängt. Scheitert der Beleg, bleibt die Spese ohne Beleg und der Fehler kommt zurück.
 */
export async function speseErfassen(personId: string, n: NeueSpese): Promise<string> {
  const { data, error } = await db()
    .from('spesen')
    .insert({
      person_id: personId,
      datum: n.datum,
      betrag_rappen: n.betrag_rappen,
      kategorie: n.kategorie,
      zweck: n.zweck.trim(),
      notiz: n.notiz,
    })
    .select('id')
    .single()
  if (error) throw error
  if (n.beleg) await belegAnhaengen(data.id, n.beleg)
  return data.id
}

/** Beleg hochladen und an die Spese hängen. */
export async function belegAnhaengen(speseId: string, datei: File): Promise<void> {
  const bild = datei.type.startsWith('image/')
  const blob = bild ? await verkleinern(datei) : datei
  const typ = bild ? blob.type || 'image/jpeg' : datei.type || 'application/octet-stream'
  const name = bild ? datei.name.replace(/\.[^.]+$/, '') + '.jpg' : datei.name
  const pfad = `spesen/${speseId}/${String(Date.now())}-${name.replace(/[^\w.-]+/g, '_')}`
  const hoch = await db().storage.from('dokumente').upload(pfad, blob, { contentType: typ })
  if (hoch.error) throw hoch.error
  const d = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: typ,
      bytes: blob.size,
      ordner: 'spesen',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'spesen',
      bezug_id: speseId,
    })
    .select('id')
    .single()
  if (d.error) throw d.error
  const { error } = await db().from('spesen').update({ beleg_id: d.data.id }).eq('id', speseId)
  if (error) throw error
}

/** Adresse zum Ansehen des Belegs (kurz gültig). */
export async function belegAdresse(belegId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('dokumente')
    .select('sharepoint_url, speicher_pfad')
    .eq('id', belegId)
    .single()
  if (error) throw error
  return dokumentAdresse(data)
}

/** Stornieren mit Grund (bleibt sichtbar, V233 «Storno statt Löschen»). */
export async function speseStornieren(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('spesen_stornieren', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Als ausbezahlt markieren (nur Buchhaltung); gibt die Anzahl zurück. */
export async function spesenAuszahlen(ids: string[], datum: string): Promise<number> {
  const { data, error } = await db().rpc('spesen_auszahlen', { p_ids: ids, p_datum: datum })
  if (error) throw error
  return data
}

/** Vermerken, dass die Spesen per Mail an die Buchhaltung gingen (Datum). */
export async function mailVermerken(ids: string[]): Promise<void> {
  const { error } = await db()
    .from('spesen')
    .update({ mail: { am: new Date().toISOString() } })
    .in('id', ids)
  if (error) throw error
}
