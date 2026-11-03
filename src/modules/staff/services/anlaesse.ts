import type { Json } from '@/types/datenbank'
import type { Anlaesse } from '../types'
import { db } from './personal'

/**
 * Geburtstage und Dienstjubiläen («Mein Tag») und die Pflicht-Ausweise je Tätigkeit. Die Datenbank liefert nie
 * den Jahrgang und lässt aus, wer sich ausgeblendet hat.
 */

/** Anlässe der nächsten Tage und ob ich mich ausgeblendet habe. */
export async function ladeAnlaesse(): Promise<Anlaesse> {
  const { data, error } = await db().rpc('team_anlaesse', {})
  if (error) throw error
  return data as unknown as Anlaesse
}

/** Eigenen Geburtstag und eigenes Jubiläum zeigen oder ausblenden. */
export async function anlassZeigen(zeigen: boolean): Promise<void> {
  const { error } = await db().rpc('team_anlass_zeigen', { p_zeigen: zeigen })
  if (error) throw error
}

/** Pflicht-Ausweise einer Tätigkeit ändern oder eine neue Tätigkeit anlegen (Text DE/FR nötig). */
export async function taetigkeitSpeichern(
  schluessel: string,
  a: { ausweise: string[]; wer: 'alle' | 'einer'; immer: boolean; text_de?: string; text_fr?: string },
): Promise<void> {
  const { error } = await db().rpc('taetigkeit_anforderung_speichern', { p_schluessel: schluessel, p: a as Json })
  if (error) throw error
}
