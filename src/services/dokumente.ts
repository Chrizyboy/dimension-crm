import { supabase } from './supabase'

/**
 * Adresse zum Öffnen eines Dokuments: SharePoint-Link oder ein 5 Minuten gültiger Link
 * auf den privaten Speicher. So bleibt der Speicher geschlossen, auch wenn ein Link weitergegeben wird.
 * Gemeinsam für Kundenakte, Lead-Akte und später Projekte.
 */
export async function dokumentAdresse(d: {
  sharepoint_url: string | null
  speicher_pfad: string | null
}): Promise<string | null> {
  if (d.sharepoint_url) return d.sharepoint_url
  if (!d.speicher_pfad || !supabase) return null
  const { data, error } = await supabase.storage.from('dokumente').createSignedUrl(d.speicher_pfad, 300)
  if (error) throw error
  return data.signedUrl
}
