import { supabase } from '@/services/supabase'
import type { Datei } from '../types'

/**
 * Dateien im privaten Speicher «fuhrpark»: Ordner fahrzeug/<id>, geraet/<id> (Fahrzeugausweis, Police,
 * Leasingvertrag, Prüfprotokoll) und eintrag/<id> (Fotos eines Schadens). Löschen darf nur die Administration.
 */
export type Ordner = 'fahrzeug' | 'geraet' | 'eintrag'

function speicher() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase.storage.from('fuhrpark')
}

/** Dateiname ohne Zeichen, die im Speicher stören; der Zeitstempel verhindert Überschreiben. */
export function sichererName(name: string, jetzt = Date.now()): string {
  const sauber = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
  return `${jetzt}-${sauber || 'datei'}`
}

/** Dateien eines Ordners, neueste zuerst. */
export async function ladeDateien(ordner: Ordner, id: string): Promise<Datei[]> {
  const { data, error } = await speicher().list(`${ordner}/${id}`, { sortBy: { column: 'name', order: 'desc' } })
  if (error) throw error
  return data
    .filter((d) => d.name !== '.emptyFolderPlaceholder')
    .map((d) => ({
      name: d.name.replace(/^\d+-/, ''),
      pfad: `${ordner}/${id}/${d.name}`,
      groesse: (d.metadata as { size?: number } | null)?.size ?? null,
    }))
}

/** Datei hochladen. */
export async function dateiHochladen(ordner: Ordner, id: string, datei: File): Promise<void> {
  const { error } = await speicher().upload(`${ordner}/${id}/${sichererName(datei.name)}`, datei, {
    contentType: datei.type || 'application/octet-stream',
  })
  if (error) throw error
}

/** Kurzlebiger Link zum Öffnen (10 Minuten). */
export async function dateiLink(pfad: string): Promise<string> {
  const { data, error } = await speicher().createSignedUrl(pfad, 600)
  if (error) throw error
  return data.signedUrl
}
