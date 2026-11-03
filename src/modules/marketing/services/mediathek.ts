import { supabase } from '@/services/supabase'
import type { MediathekFoto } from '../types'

/**
 * Fotos für Werbung (Entscheid 0056): Fotos aus Rapporten mit Ort und Anlage, nie Name oder Adresse. Ob ein Foto
 * verwendet werden darf, steht am Rapport (der Kunde hat es erlaubt); nachtragen nur mit Vermerk beim Kunden.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Fotos der letzten drei Jahre, neueste zuerst. */
export async function ladeFotos(): Promise<MediathekFoto[]> {
  const { data, error } = await db().rpc('mediathek_fotos')
  if (error) throw error
  return data
}

/** Kurz gültige Adressen (10 Minuten) für die Vorschaubilder, in einem Aufruf. */
export async function fotoAdressen(fotos: MediathekFoto[]): Promise<Record<string, string>> {
  const intern = fotos.filter((f) => f.speicher_pfad)
  const aus: Record<string, string> = {}
  for (const f of fotos) if (!f.speicher_pfad && f.sharepoint_url) aus[f.id] = f.sharepoint_url
  if (!intern.length) return aus
  const { data, error } = await db()
    .storage.from('dokumente')
    .createSignedUrls(
      intern.map((f) => f.speicher_pfad ?? ''),
      600,
    )
  if (error) throw error
  intern.forEach((f, i) => {
    const url = data[i]?.signedUrl
    if (url) aus[f.id] = url
  })
  return aus
}

/** Erlaubnis am Rapport setzen oder entziehen (mit Grund, steht im Verlauf des Kunden). */
export async function fotoErlaubnis(rapportId: string, erlaubt: boolean, grund: string | null) {
  const { error } = await db().rpc('foto_werbung_setzen', {
    p_rapport: rapportId,
    p_erlaubt: erlaubt,
    ...(grund ? { p_grund: grund } : {}),
  })
  if (error) throw error
}

/** Foto als Titelbild markieren. */
export async function fotoTitel(dokumentId: string, titel: boolean) {
  const { error } = await db().rpc('foto_titel_setzen', { p_dokument: dokumentId, p_titel: titel })
  if (error) throw error
}
