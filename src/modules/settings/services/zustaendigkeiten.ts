import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { Zustaendigkeiten } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Zuständigkeiten (Verkauf nach Regeln, Offerten, Stellvertretung) aus den Einstellungen. */
export async function ladeZustaendigkeiten(): Promise<Zustaendigkeiten> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'zustaendigkeiten').single()
  if (error) throw error
  const w = data.wert as Partial<Zustaendigkeiten>
  return { verkauf: w.verkauf ?? [], offerten: w.offerten ?? null, stellvertretung: w.stellvertretung ?? {} }
}

/** Regionen für die Regeln (Nummer und Name). */
export async function ladeRegionen(): Promise<{ nummer: number; name: string }[]> {
  const { data, error } = await db().from('regionen').select('nummer, name').is('geloescht_am', null).order('nummer')
  if (error) throw error
  return data
}

/**
 * Speichern (nur Administration, die Datenbank prüft das Recht). Genauere Regeln (mehr Bedingungen) kommen
 * zuerst, damit «Wärmepumpe → Andy» vor «Deutsch → Loris» greift, ohne dass man die Reihenfolge pflegen muss.
 */
export async function speichereZustaendigkeiten(z: Zustaendigkeiten): Promise<void> {
  const bedingungen = (r: Zustaendigkeiten['verkauf'][number]) =>
    [r.sprache, r.standort, r.region, r.produkt].filter((x) => x != null).length
  const verkauf = z.verkauf
    .filter((r) => r.person)
    .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v != null && v !== '')))
    .sort((a, b) => bedingungen(b as (typeof z.verkauf)[number]) - bedingungen(a as (typeof z.verkauf)[number]))
  const stellvertretung = Object.fromEntries(Object.entries(z.stellvertretung).filter(([k, v]) => k && v && k !== v))
  const wert = { verkauf, offerten: z.offerten, stellvertretung } as unknown as { [k: string]: Json }
  const { error } = await db().from('einstellungen').update({ wert }).eq('schluessel', 'zustaendigkeiten')
  if (error) throw error
}
