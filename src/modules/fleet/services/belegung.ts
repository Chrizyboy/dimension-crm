import { supabase } from '@/services/supabase'
import type { Belegung } from '../types'

/**
 * Belegung und Reservierungen. Gelesen wird die Sicht `ressourcen_belegung` (Reservierungen plus «Fahrzeug folgt
 * dem Team» aus dem Zeitplan), geschrieben nur über `ressource_reservieren` und `ressource_reservierung_aufheben`.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alles, was den Zeitraum von–bis (inklusive) berührt. */
export async function ladeBelegung(von: string, bis: string): Promise<Belegung[]> {
  const { data, error } = await db()
    .from('ressourcen_belegung')
    .select('*')
    .lte('von', bis)
    .gte('bis', von)
    .order('von')
  if (error) throw error
  return data as Belegung[]
}

/** Neue oder geänderte Reservierung (wiederholbar: dieselbe id ändert). */
export interface Reservierung {
  id: string
  fahrzeug_id: string | null
  geraet_id: string | null
  von: string
  bis: string
  art: 'hand' | 'werkstatt' | 'einsatz'
  einsatz_id: string | null
  person_id: string | null
  zweck: string | null
}

/** Fahrzeug oder Gerät reservieren; gibt die id zurück. */
export async function reservieren(r: Reservierung): Promise<string> {
  const { data, error } = await db().rpc('ressource_reservieren', {
    p_id: r.id,
    p_fahrzeug: r.fahrzeug_id as string,
    p_geraet: r.geraet_id as string,
    p_von: r.von,
    p_bis: r.bis,
    p_art: r.art,
    ...(r.einsatz_id ? { p_einsatz: r.einsatz_id } : {}),
    ...(r.person_id ? { p_person: r.person_id } : {}),
    ...(r.zweck ? { p_zweck: r.zweck } : {}),
  })
  if (error) throw error
  return data
}

/** Reservierung aufheben (Papierkorb). */
export async function reservierungAufheben(id: string): Promise<void> {
  const { error } = await db().rpc('ressource_reservierung_aufheben', { p_id: id })
  if (error) throw error
}
