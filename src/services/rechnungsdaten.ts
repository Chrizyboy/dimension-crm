import { supabase } from './supabase'
import type { Empfaenger, Position, Rechnung, RechnungVoll, Zahlung } from '@/types/rechnung'

/**
 * Eine Rechnung laden und ihr PDF ablegen. Gemeinsam für das Modul Rechnungen und für Werkverträge, die
 * die Anzahlungsrechnung mit dem Vertrag senden (Module importieren sich nie gegenseitig, Regel 2).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Spalten der Firma für Rechnung und QR-Zahlteil. */
export const FIRMA_SPALTEN =
  'id, kuerzel, name, strasse, plz, ort, sprache, mwst_nr, uid_nr, iban, bank, telefon, email, zahlungsfrist_tage'

/** Eine Rechnung mit Positionen, Firma, Empfänger-Adresse und Zahlungen. */
export async function ladeRechnung(id: string): Promise<RechnungVoll> {
  const [l, r, z] = await Promise.all([
    db().from('rechnungen_liste').select('*').eq('id', id).single(),
    db().from('rechnungen').select('positionen, mwst_satz, notiz, storniert_grund').eq('id', id).single(),
    db()
      .from('rechnung_zahlungen')
      .select('id, datum, betrag_rappen, quelle, notiz')
      .eq('rechnung_id', id)
      .is('geloescht_am', null)
      .order('datum'),
  ])
  if (l.error) throw l.error
  if (r.error) throw r.error
  if (z.error) throw z.error
  const liste = l.data as unknown as Rechnung
  const [f, k, o] = await Promise.all([
    db().from('firmen').select(FIRMA_SPALTEN).eq('id', liste.firma_id).single(),
    db().from('kontakte').select('anrede, email').eq('id', liste.kontakt_id).single(),
    db()
      .from('objekte')
      .select('strasse, plz, ort')
      .eq('kontakt_id', liste.kontakt_id)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (f.error) throw f.error
  const empfaenger: Empfaenger = {
    name: liste.kunde,
    anrede: k.data?.anrede ?? null,
    email: k.data?.email ?? null,
    strasse: o.data?.strasse ?? null,
    plz: o.data?.plz ?? null,
    ort: o.data?.ort ?? null,
  }
  return {
    ...liste,
    positionen: r.data.positionen as unknown as Position[],
    mwst_satz: r.data.mwst_satz,
    notiz: r.data.notiz,
    storniert_grund: r.data.storniert_grund,
    firma_daten: f.data,
    empfaenger,
    zahlungen: z.data as Zahlung[],
  }
}

/** PDF hochladen und bei der Rechnung ablegen; gibt Dokument-ID und Dateiname zurück. */
export async function rechnungPdfAblegen(
  r: RechnungVoll,
  bytes: Uint8Array,
  mahnstufe = 0,
): Promise<{ id: string; name: string }> {
  const name = `${r.nummer ?? 'Entwurf'}${mahnstufe ? `-Mahnung-${String(mahnstufe)}` : ''}.pdf`
  const pfad = `rechnungen/${r.id}/${String(Date.now())}-${name}`
  const datei = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'rechnungen',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'rechnungen',
      bezug_id: r.id,
    })
    .select('id')
    .single()
  if (error) throw error
  if (!mahnstufe) await db().from('rechnungen').update({ dokument_id: data.id }).eq('id', r.id)
  return { id: data.id, name }
}
