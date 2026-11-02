import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { DateiZeile } from '../lib/preisDatei'
import type { ImportErgebnis, PreisImport } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Eingelesene Preislisten: offene zuerst, danach die letzten 20 erledigten. */
export async function ladeImporte(): Promise<PreisImport[]> {
  const { data, error } = await db()
    .from('preis_importe')
    .select('id, quelle, dateiname, status, ergebnis, zaehlung, zuordnung, erstellt_am, erledigt_am, erledigt_von')
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(40)
  if (error) throw error
  return data.map((i) => ({
    id: i.id,
    quelle: i.quelle,
    dateiname: i.dateiname,
    status: i.status as PreisImport['status'],
    ergebnis: Array.isArray(i.ergebnis) ? (i.ergebnis as unknown as ImportErgebnis[]) : [],
    zaehlung: i.zaehlung as Record<string, number>,
    zuordnung: i.zuordnung as Record<string, string>,
    erstelltAm: i.erstellt_am,
    erledigtAm: i.erledigt_am,
    erledigtVon: i.erledigt_von,
  }))
}

/** Datei prüfen und als «offen» ablegen; zurück kommen Kennung und Zählung. Gespeichert wird noch kein Preis. */
export async function legeImportAn(p: {
  quelle: string
  lieferantId: string | null
  dateiname: string
  zuordnung: Record<string, string>
  zeilen: DateiZeile[]
  vollstaendig: boolean
}): Promise<{ id: string } & Record<string, number>> {
  const { data, error } = await db().rpc('preis_import_anlegen', {
    p_quelle: p.quelle,
    p_lieferant: p.lieferantId as string,
    p_dateiname: p.dateiname,
    p_zuordnung: p.zuordnung as Json,
    p_zeilen: p.zeilen as unknown as Json,
    p_vollstaendig: p.vollstaendig,
  })
  if (error) throw error
  return data as { id: string } & Record<string, number>
}

/** Gewählte Zeilen übernehmen; neue Artikel brauchen eine Kategorie. */
export async function uebernimmImport(id: string, zeilen: number[] | null, neu: { i: number; kategorie: string }[]) {
  const { data, error } = await db().rpc('preis_import_uebernehmen', {
    p_import: id,
    ...(zeilen ? { p_zeilen: zeilen } : {}),
    p_neu: neu as unknown as Json,
  })
  if (error) throw error
  const r = (data ?? {}) as Record<string, number>
  return { geaendert: r.geaendert ?? 0, neu: r.neu ?? 0 }
}

/** Eingelesene Datei verwerfen. */
export async function verwirfImport(id: string) {
  const { error } = await db().rpc('preis_import_verwerfen', { p_import: id })
  if (error) throw error
}
