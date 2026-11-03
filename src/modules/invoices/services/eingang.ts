import type { EingangFilter, Eingangsrechnung, EingangVergleich } from '../types'
import { db } from './rechnungen'

/**
 * Eingangsrechnungen (Lieferanten) mit Visum: Erstvisum Projektleitung, Zweitvisum Geschäftsleitung ab dem
 * Betrag in den Einstellungen oder ohne Bestellung. Wer was sieht und visieren darf, prüft die Datenbank.
 */

/** Liste nach Filter; «meine» = wartet auf mein Visum (Projektleitung oder Geschäftsleitung). */
export async function ladeEingang(filter: EingangFilter): Promise<Eingangsrechnung[]> {
  let q = db().from('eingangsrechnungen_liste').select('*')
  if (filter === 'offen') q = q.in('status', ['visum_pl', 'visum_gl'])
  if (filter === 'bereit') q = q.eq('status', 'bereit')
  if (filter === 'neu') q = q.eq('status', 'neu')
  if (filter === 'bezahlt') q = q.eq('status', 'bezahlt')
  if (filter === 'abgelehnt') q = q.eq('status', 'abgelehnt')
  if (filter === 'meine') q = q.eq('ich_visiere', true)
  const { data, error } = await q.order('faellig_am', { ascending: true, nullsFirst: false }).limit(1000)
  if (error) throw error
  return data as unknown as Eingangsrechnung[]
}

/** Eine Eingangsrechnung für die Akte. */
export async function ladeEingangEine(id: string): Promise<Eingangsrechnung> {
  const { data, error } = await db().from('eingangsrechnungen_liste').select('*').eq('id', id).single()
  if (error) throw error
  return data as unknown as Eingangsrechnung
}

/** Vergleich mit der Bestellung (Positionen, geliefert, Differenz). */
export async function ladeVergleich(id: string): Promise<EingangVergleich> {
  const { data, error } = await db().rpc('eingang_vergleich', { p_id: id })
  if (error) throw error
  return data as unknown as EingangVergleich
}

/** Visum geben (ok) oder ablehnen (mit Grund). Gibt den neuen Stand zurück. */
export async function visieren(id: string, ok: boolean, bemerkung: string): Promise<string> {
  const { data, error } = await db().rpc('eingang_visieren', { p_id: id, p_ok: ok, p_bemerkung: bemerkung })
  if (error) throw error
  return data
}

/** Als bezahlt markieren (normal macht das der Abgleich mit AbaNinja). */
export async function eingangBezahlt(id: string, datum: string): Promise<void> {
  const { error } = await db().rpc('eingang_bezahlt', { p_id: id, p_datum: datum })
  if (error) throw error
}

/** Was «Rechnung erfassen» speichert. */
export interface EingangDaten {
  lieferant: string
  nummer: string
  datum: string
  faellig_am: string
  betrag_rappen: number
  skonto_prozent: string
  skonto_bis: string
  projekt_id: string | null
  bestellung_id: string | null
  dokument_id?: string | null
  text: string
}

/** Erfassen (ohne ID) oder ändern. Gibt die ID zurück. */
export async function eingangSpeichern(id: string | null, p: EingangDaten): Promise<string> {
  const { data, error } = await db().rpc('eingang_speichern', { p_id: id as never, p: p as never })
  if (error) throw error
  return data
}

/** Projekt und Bestellung zur Nummer suchen (für «Rechnung erfassen»). */
export async function findeNummer(
  tabelle: 'projekte' | 'bestellungen',
  nummer: string,
): Promise<{ id: string } | null> {
  const { data, error } = await db()
    .from(tabelle)
    .select('id')
    .eq('nummer', nummer.trim())
    .is('geloescht_am', null)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Beleg (PDF oder Foto) in den privaten Speicher legen und als Dokument erfassen; gibt die Dokument-ID zurück. */
export async function belegHochladen(datei: File): Promise<string> {
  const name = datei.name.replace(/[^\w.\- ]+/g, '_')
  const pfad = `eingang/${crypto.randomUUID()}/${name}`
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: datei.type })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: datei.type || 'application/octet-stream',
      bytes: datei.size,
      ordner: 'eingang',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'eingangsrechnungen',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Link zum Beleg (5 Minuten gültig). */
export async function belegAdresse(dokumentId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('dokumente')
    .select('speicher_pfad, sharepoint_url')
    .eq('id', dokumentId)
    .single()
  if (error) throw error
  const { dokumentAdresse } = await import('@/services/dokumente')
  return dokumentAdresse(data)
}
