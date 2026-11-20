import { eindeutigeNamen } from '@/lib/datei'
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

/** Was eine Datei zum Laden, Zeigen und Anhängen braucht (Zeile aus `dokumente`). */
export interface DokumentQuelle {
  id: string
  name: string
  mime_typ?: string | null
  sharepoint_url: string | null
  speicher_pfad: string | null
}

/**
 * Inhalt einer Datei aus dem CRM-Speicher. Dateien, die nur in SharePoint liegen, lädt die App nicht selbst
 * (dort gilt die Anmeldung bei Microsoft), darum `null`.
 */
export async function dokumentInhalt(d: Pick<DokumentQuelle, 'speicher_pfad'>): Promise<Blob | null> {
  if (!d.speicher_pfad || !supabase) return null
  const { data, error } = await supabase.storage.from('dokumente').download(d.speicher_pfad)
  if (error) throw error
  return data
}

/**
 * Mehrere Dateien als ein ZIP (V234 «Alle herunterladen»). Gleiche Namen werden nummeriert; Dateien nur in
 * SharePoint oder nicht mehr im Speicher fehlen im ZIP und werden zurückgegeben, damit die Meldung sie nennt.
 */
export async function dokumenteAlsZip(liste: DokumentQuelle[]): Promise<{ zip: Uint8Array; ohne: string[] }> {
  // fflate erst beim ersten ZIP laden, nicht mit der App.
  const { zipSync } = await import('fflate')
  const geladen: { name: string; daten: Uint8Array }[] = []
  const ohne: string[] = []
  for (const d of liste) {
    // Eine fehlende Datei soll nicht das ganze ZIP verhindern; sie steht danach in der Meldung.
    const blob = await dokumentInhalt(d).catch(() => null)
    if (blob) geladen.push({ name: d.name, daten: new Uint8Array(await blob.arrayBuffer()) })
    else ohne.push(d.name)
  }
  if (geladen.length === 0) throw new Error('zip.leer')
  const namen = eindeutigeNamen(geladen.map((g) => g.name))
  // Bilder und PDF sind schon gepackt: nur speichern (level 0) ist viel schneller und kaum grösser.
  const zip = zipSync(Object.fromEntries(geladen.map((g, i) => [namen[i] ?? g.name, [g.daten, { level: 0 }]])))
  return { zip, ohne }
}
