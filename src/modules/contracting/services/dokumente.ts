import { mailVorbereiten } from '@/services/ausgang'
import { supabase } from '@/services/supabase'
import type { Grossprojekt } from '../types'

/**
 * Potenzialanalyse und Dossier ablegen und als Mail in den Ausgangskorb legen (Regel 6: gesendet wird erst nach dem
 * Klick auf «Senden» im Fenster, das ist die Freigabe). Die PDFs selbst baut `lib/…Pdf.ts` in der App.
 */

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Wer im PDF als Absender steht: Firma des Standorts und die verantwortliche Person bei uns. */
export interface Absender {
  firma: string
  strasse: string | null
  plz: string | null
  ort: string | null
  telefon: string | null
  email: string | null
  person: string | null
  person_email: string | null
}

/** Absender für ein Grossprojekt laden (Firma über den Standort, sonst die erste Firma). */
export async function ladeAbsender(g: Pick<Grossprojekt, 'id' | 'verantwortlich_id'>): Promise<Absender> {
  const zeile = await db()
    .from('grossprojekte')
    .select('standort:standorte(firma:firmen(name, strasse, plz, ort, telefon, email))')
    .eq('id', g.id)
    .single()
  if (zeile.error) throw zeile.error
  type F = {
    name: string
    strasse: string | null
    plz: string | null
    ort: string | null
    telefon: string | null
    email: string | null
  }
  let firma = (zeile.data as unknown as { standort: { firma: F | null } | null }).standort?.firma ?? null
  if (!firma) {
    const r = await db()
      .from('firmen')
      .select('name, strasse, plz, ort, telefon, email')
      .is('geloescht_am', null)
      .limit(1)
    if (r.error) throw r.error
    firma = r.data[0] ?? null
  }
  let person: { name: string; email: string | null } | null = null
  if (g.verantwortlich_id) {
    const p = await db().from('personen').select('name, email').eq('id', g.verantwortlich_id).maybeSingle()
    if (p.error) throw p.error
    person = p.data
  }
  return {
    firma: firma?.name ?? 'Dimension Solaire',
    strasse: firma?.strasse ?? null,
    plz: firma?.plz ?? null,
    ort: firma?.ort ?? null,
    telefon: firma?.telefon ?? null,
    email: firma?.email ?? null,
    person: person?.name ?? null,
    person_email: person?.email ?? null,
  }
}

/** PDF in den Speicher legen und als Dokument des Grossprojekts erfassen; gibt Dokument-ID und Name zurück. */
export async function pdfAblegen(
  g: Pick<Grossprojekt, 'id'>,
  name: string,
  bytes: Uint8Array,
): Promise<{ id: string; name: string }> {
  const pfad = `grossprojekte/${g.id}/${String(Date.now())}-${name}`
  const datei = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'grossprojekte',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'grossprojekte',
      bezug_id: g.id,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, name }
}

/** Was das Mail-Fenster abschickt. */
export interface Versand {
  art: 'potenzialanalyse' | 'youdera_dossier'
  an: string
  cc?: string
  betreff: string
  text: string
  sprache: 'de' | 'fr'
  anhang: { id: string; name: string }
}

/**
 * Mail mit Anhang in den Ausgangskorb, freigegeben durch den Klick. Der Schlüssel verhindert, dass dieselbe Mail am
 * gleichen Tag doppelt entsteht (Doppelklick).
 */
export async function mailMitPdf(
  g: Pick<Grossprojekt, 'id' | 'verkaufschance_id'>,
  v: Versand,
  tag: string,
): Promise<string> {
  return mailVorbereiten(
    {
      an: v.an,
      ...(v.cc ? { cc: v.cc } : {}),
      betreff: v.betreff,
      text: v.text,
      sprache: v.sprache,
      art: v.art,
      bezug_tabelle: 'grossprojekte',
      bezug_id: g.id,
      ...(g.verkaufschance_id ? { verkaufschance_id: g.verkaufschance_id } : {}),
      schluessel: `${v.art}:${g.id}:${tag}`,
      anhaenge: [{ dokument_id: v.anhang.id, name: v.anhang.name }],
    },
    true,
  )
}
