import { verkleinern } from '@/lib/bild'
import { rufeKi, type KiBezug } from '@/services/ki'
import { supabase } from '@/services/supabase'
import type { DokumentErgebnis, Gespraech, GespraechKurz, Runde, Vorlage, VorlageEingabe } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Frage ans CRM stellen. Mit `gespraechId` geht das Gespräch weiter, mit `bezug` kennt der Assistent den Datensatz. */
export function stelleFrage(e: {
  frage: string
  sprache: 'de' | 'fr'
  gespraechId?: string | null
  bezug?: KiBezug | null
}): Promise<{ gespraech_id: string; runde: Runde; kosten_millirappen: number }> {
  return rufeKi('frage', {
    frage: e.frage,
    sprache: e.sprache,
    ...(e.gespraechId ? { gespraech_id: e.gespraechId } : {}),
    ...(e.bezug ? { tabelle: e.bezug.tabelle, id: e.bezug.id } : {}),
  })
}

/** Datei als Base64 (Bilder vorher verkleinert, damit sie schnell und günstig gelesen werden). */
async function alsBase64(datei: File): Promise<{ typ: string; base64: string }> {
  const blob = datei.type.startsWith('image/') ? await verkleinern(datei) : datei
  const typ = blob.type || datei.type
  const daten = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < daten.length; i += 0x8000) s += String.fromCharCode(...daten.subarray(i, i + 0x8000))
  return { typ, base64: btoa(s) }
}

/** Dokument lesen lassen (PDF oder Bild bis 5 MB). */
export async function leseDokument(datei: File, sprache: 'de' | 'fr'): Promise<DokumentErgebnis> {
  return rufeKi<DokumentErgebnis>('dokument', { name: datei.name, sprache, datei: await alsBase64(datei) })
}

/** Eigene Gespräche, neueste zuerst (RLS: nur die eigenen). */
export async function ladeGespraeche(): Promise<GespraechKurz[]> {
  const { data, error } = await db()
    .from('ki_gespraeche')
    .select('id, art, titel, bezug_tabelle, bezug_id, kosten_millirappen, geaendert_am, nachrichten')
    .is('geloescht_am', null)
    .order('geaendert_am', { ascending: false })
    .limit(100)
  if (error) throw error
  return data.map((g) => {
    const n = (g.nachrichten as unknown as Runde[] | null) ?? []
    return {
      id: g.id,
      art: g.art as GespraechKurz['art'],
      titel: g.titel,
      bezug_tabelle: g.bezug_tabelle,
      bezug_id: g.bezug_id,
      kosten_millirappen: g.kosten_millirappen,
      geaendert_am: g.geaendert_am,
      runden: n.length,
      vorschlaege: n.reduce((s, r) => s + r.vorschlaege.length, 0),
    }
  })
}

/** Ein Gespräch mit allen Runden. */
export async function ladeGespraech(id: string): Promise<Gespraech | null> {
  const { data, error } = await db()
    .from('ki_gespraeche')
    .select('id, art, titel, bezug_tabelle, bezug_id, nachrichten')
    .eq('id', id)
    .is('geloescht_am', null)
    .maybeSingle()
  if (error) throw error
  return data
    ? { ...data, art: data.art as Gespraech['art'], nachrichten: data.nachrichten as unknown as Runde[] }
    : null
}

/** Gespräch in den Papierkorb (Regel 5). */
export async function gespraechEntfernen(id: string): Promise<void> {
  const { error } = await db().from('ki_gespraeche').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Aufträge: Firmenvorlagen und eigene (RLS). */
export async function ladeVorlagen(): Promise<Vorlage[]> {
  const { data, error } = await db()
    .from('ki_vorlagen')
    .select('id, person_id, art, titel_de, titel_fr, text_de, text_fr, auftrag, kundenart, rollen, reihenfolge')
    .is('geloescht_am', null)
    .order('reihenfolge')
  if (error) throw error
  return data as Vorlage[]
}

/** Auftrag anlegen oder ändern. Ohne `person_id` ist es eine Firmenvorlage (nur Administration). */
export async function speichereVorlage(v: VorlageEingabe, id?: string): Promise<void> {
  const zeile = {
    person_id: v.person_id,
    art: v.art,
    titel_de: v.titel,
    titel_fr: v.titel_fr || v.titel,
    text_de: v.text,
    text_fr: v.text,
    auftrag: v.auftrag,
    kundenart: v.art === 'text' ? v.kundenart : null,
    rollen: v.rollen,
  }
  const { error } = id
    ? await db().from('ki_vorlagen').update(zeile).eq('id', id)
    : await db().from('ki_vorlagen').insert(zeile)
  if (error) throw error
}

/** Auftrag in den Papierkorb. */
export async function vorlageEntfernen(id: string): Promise<void> {
  const { error } = await db().from('ki_vorlagen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Aufgabe aus einem Vorschlag anlegen (erst nach dem Klick), mit Bezug, für mich oder eine andere Person. */
export async function legeAufgabeAn(e: {
  titel: string
  text?: string | null
  faellig_am: string | null
  person_id: string | null
  bezug?: KiBezug | null
}): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .insert({
      titel: e.titel,
      text: e.text ?? null,
      faellig_am: e.faellig_am,
      person_id: e.person_id,
      bezug_tabelle: e.bezug?.tabelle ?? null,
      bezug_id: e.bezug?.id ?? null,
    })
  if (error) throw error
}

/** Funktion ein- oder ausschalten (Einstellung «ki», nur Administration). */
export async function schalteFunktion(funktion: string, ein: boolean): Promise<void> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'ki').single()
  if (error) throw error
  const wert = data.wert as Record<string, unknown>
  const aus = new Set(Array.isArray(wert.aus) ? (wert.aus as string[]) : [])
  if (ein) aus.delete(funktion)
  else aus.add(funktion)
  const { error: f } = await db()
    .from('einstellungen')
    .update({ wert: { ...wert, aus: [...aus] } })
    .eq('schluessel', 'ki')
  if (f) throw f
}
