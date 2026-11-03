import type { RechnungAn, VerlaufEintrag } from '../types'
import { db } from './rechnungen'

/**
 * Was in der Akte einer gestellten Rechnung im Alltag dazukommt: Angaben, Mahnsperre, Zahlungszusage, Notizen,
 * Ausbuchen und der Verlauf. Die Regeln (wer darf, was bleibt fest) liegen in den rechnung_*-Funktionen.
 */

/** Rechnungsadresse, Referenz des Kunden und Versandweg (auch nach dem Stellen änderbar). */
export async function angabenSpeichern(
  id: string,
  p: { rechnung_an: RechnungAn | null; kunden_referenz: string | null; versandweg: 'mail' | 'post' },
): Promise<void> {
  const { error } = await db().rpc('rechnung_angaben', { p_id: id, p: p as never })
  if (error) throw error
}

/** Mahnsperre bis zu einem Datum (ohne Datum = aufheben). */
export async function mahnsperreSetzen(id: string, bis: string | null, grund: string): Promise<void> {
  const { error } = await db().rpc('rechnung_mahnsperre', { p_id: id, p_bis: bis as never, p_grund: grund })
  if (error) throw error
}

/** Zahlungszusage des Kunden: bis zum Datum wird nicht gemahnt. */
export async function zusageEintragen(id: string, bis: string, text: string): Promise<void> {
  const { error } = await db().rpc('rechnung_zusage', { p_id: id, p_bis: bis, p_text: text })
  if (error) throw error
}

/** Notiz, Anruf oder Mail im Verlauf festhalten. */
export async function notizEintragen(id: string, art: 'notiz' | 'anruf' | 'mail', text: string): Promise<void> {
  const { error } = await db().rpc('rechnung_notiz', { p_id: id, p_art: art, p_text: text })
  if (error) throw error
}

/** Rest ausbuchen (Rundung, Skonto, Kulanz, Verlust); gebucht wird in AbaNinja. */
export async function ausbuchen(
  id: string,
  betrag: number,
  art: 'rundung' | 'skonto' | 'kulanz' | 'verlust',
  grund: string,
): Promise<void> {
  const { error } = await db().rpc('rechnung_ausbuchen', { p_id: id, p_betrag: betrag, p_art: art, p_grund: grund })
  if (error) throw error
}

/** Verlauf: Ereignisse, Zahlungen und Mails aus dem Ausgangskorb, neueste zuerst. */
export async function ladeVerlauf(id: string): Promise<VerlaufEintrag[]> {
  const { data, error } = await db().rpc('rechnung_verlauf', { p_id: id })
  if (error) throw error
  return (data ?? []) as unknown as VerlaufEintrag[]
}
