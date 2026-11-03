import { supabase } from '@/services/supabase'

/** Rollen, Nachweise, Dateien und Bewertungen eines Partners (Entscheid 0049). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Rolle hinzufügen oder ihre Angaben ändern. */
export async function speichereRolle(kontaktId: string, rolle: string, angaben: Record<string, unknown>, id?: string) {
  const { error } = id
    ? await db()
        .from('kontakt_rollen')
        .update({ angaben: angaben as never })
        .eq('id', id)
    : await db()
        .from('kontakt_rollen')
        .insert({ kontakt_id: kontaktId, rolle, angaben: angaben as never })
  if (error) throw error
}

/** Rolle entfernen (Papierkorb; Lieferant/Subunternehmer im Einkauf und in Projekten bleiben). */
export async function entferneRolle(id: string): Promise<void> {
  const { error } = await db().from('kontakt_rollen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Nachweis erfassen oder ändern; mit Datei wird sie zuerst im privaten Speicher abgelegt. */
export async function speichereNachweis(
  kontaktId: string,
  n: { id?: string; art: string; gueltig_bis: string | null; notiz: string | null },
  datei?: File,
): Promise<void> {
  const dokumentId = datei ? await dateiAblegen(kontaktId, datei, 'nachweise') : undefined
  const zeile = {
    art: n.art,
    gueltig_bis: n.gueltig_bis || null,
    notiz: n.notiz?.trim() || null,
    ...(dokumentId ? { dokument_id: dokumentId } : {}),
  }
  const { error } = n.id
    ? await db().from('partner_nachweise').update(zeile).eq('id', n.id)
    : await db()
        .from('partner_nachweise')
        .insert({ ...zeile, kontakt_id: kontaktId })
  if (error) throw error
}

/** Nachweis entfernen (Papierkorb). */
export async function entferneNachweis(id: string): Promise<void> {
  const { error } = await db().from('partner_nachweise').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Datei zum Partner ablegen (Vertrag, Preisliste, Nachweis) im privaten Speicher; gibt die Dokument-ID zurück. */
export async function dateiAblegen(kontaktId: string, datei: File, ordner = 'partner'): Promise<string> {
  const pfad = `partner/${kontaktId}/${String(Date.now())}-${datei.name.replace(/[^\w.\- ]+/g, '_')}`
  const hoch = await db()
    .storage.from('dokumente')
    .upload(pfad, datei, { contentType: datei.type || 'application/octet-stream' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name: datei.name,
      mime_typ: datei.type || null,
      bytes: datei.size,
      ordner,
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'kontakte',
      bezug_id: kontaktId,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Kurzer Link zum Öffnen einer abgelegten Datei (1 Stunde gültig). */
export async function dateiLink(pfad: string): Promise<string> {
  const { data, error } = await db().storage.from('dokumente').createSignedUrl(pfad, 3600)
  if (error) throw error
  return data.signedUrl
}

/** Auftrag eines Subunternehmers bewerten (1–5 je Qualität, Termin, Preis). */
export async function bewerteAuftrag(
  id: string,
  b: { qualitaet: number | null; termin: number | null; preis: number | null },
) {
  const { error } = await db()
    .from('subunternehmer_auftraege')
    .update({ bewertung_qualitaet: b.qualitaet, bewertung_termin: b.termin, bewertung_preis: b.preis })
    .eq('id', id)
  if (error) throw error
}
