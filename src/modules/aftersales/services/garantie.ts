import { supabase } from '@/services/supabase'
import type { Garantiefall } from '../types'

/** Garantiefälle beim Hersteller (Rücksendung, Ersatzteil, Gutschrift). Datum je Stand setzt die Datenbank. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, service_fall_id, anlage_id, hersteller, komponente, seriennummer, rma_nummer, status, gemeldet_am, eingeschickt_am, ersatz_am, gutschrift_rappen, abgeschlossen_am, notiz'

/** Garantiefälle eines Service-Falls, älteste zuerst. */
export async function ladeGarantiefaelle(fallId: string): Promise<Garantiefall[]> {
  const { data, error } = await db()
    .from('garantiefaelle')
    .select(FELDER)
    .eq('service_fall_id', fallId)
    .is('geloescht_am', null)
    .order('erstellt_am')
  if (error) throw error
  return data as Garantiefall[]
}

/** Garantiefall anlegen oder ändern. */
export async function garantiefallSpeichern(
  g: Omit<Garantiefall, 'id' | 'gemeldet_am' | 'eingeschickt_am' | 'ersatz_am' | 'abgeschlossen_am'> & { id?: string },
): Promise<void> {
  const { id, ...felder } = g
  const { error } = id
    ? await db().from('garantiefaelle').update(felder).eq('id', id)
    : await db().from('garantiefaelle').insert(felder)
  if (error) throw error
}
