import { supabase } from '@/services/supabase'
import type { Rapport } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Empfänger des Rapports: der Kunde des Projekts, Service-Falls oder Wartungsvertrags. */
export interface RapportKunde {
  kontakt_id: string
  email: string | null
  sprache: 'de' | 'fr'
  vorname: string | null
  nachname: string | null
}

/** Kunde zum Rapport suchen (Projekt vor Service-Fall vor Wartungsvertrag); null, wenn keiner da ist. */
export async function ladeRapportKunde(r: Rapport): Promise<RapportKunde | null> {
  const [tabelle, id] = r.projekt_id
    ? (['projekte', r.projekt_id] as const)
    : r.service_fall_id
      ? (['service_faelle', r.service_fall_id] as const)
      : r.wartungsvertrag_id
        ? (['wartungsvertraege', r.wartungsvertrag_id] as const)
        : ([null, null] as const)
  if (!tabelle) return null
  const bezug = await db().from(tabelle).select('kontakt_id').eq('id', id).maybeSingle()
  if (bezug.error) throw bezug.error
  const kontaktId = bezug.data?.kontakt_id
  if (!kontaktId) return null
  const { data, error } = await db()
    .from('kontakte')
    .select('id, email, sprache, vorname, nachname')
    .eq('id', kontaktId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    kontakt_id: data.id,
    email: data.email,
    sprache: data.sprache === 'fr' ? 'fr' : 'de',
    vorname: data.vorname,
    nachname: data.nachname,
  }
}

/** Rapport-PDF als Dokument des Rapports ablegen (für die Mail und die Akte). */
export async function rapportPdfAblegen(r: Rapport, bytes: Uint8Array): Promise<{ id: string; name: string }> {
  const name = `Rapport-${r.nummer || r.id.slice(0, 8)}.pdf`
  const pfad = `rapporte/${r.id}/${String(Date.now())}-${name}`
  const hoch = await db()
    .storage.from('dokumente')
    .upload(pfad, new Blob([bytes as BlobPart], { type: 'application/pdf' }), { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'rapport_pdf',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'rapporte',
      bezug_id: r.id,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, name }
}
