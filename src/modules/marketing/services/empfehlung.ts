import { supabase } from '@/services/supabase'
import type { Bewertungsanfrage, Empfehlung } from '../types'

/**
 * Datenzugriff «Empfehlungen» (Modul-Prüfung 32A). Regeln (Werbesperre, Link nur mit Werkvertrag, Gutschrift erst
 * mit unterschriebenem Werkvertrag, wer auszahlen darf) liegen in den Datenbank-Funktionen `bewertung_*`/`empfehlung_*`.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Bewertungsanfragen: offene zuerst (bereit, dann in Prüfung), danach die letzten entschiedenen. */
export async function ladeBewertungsanfragen(): Promise<Bewertungsanfrage[]> {
  const { data, error } = await db()
    .from('bewertungsanfragen_liste')
    .select('*')
    .order('faellig_am', { ascending: false })
    .limit(300)
  if (error) throw error
  return data as unknown as Bewertungsanfrage[]
}

/** Empfehlungen mit Empfehler, Neukunde und Gutschrift. */
export async function ladeEmpfehlungen(): Promise<Empfehlung[]> {
  const { data, error } = await db()
    .from('empfehlungen_liste')
    .select('*')
    .order('erstellt_am', { ascending: false })
    .limit(300)
  if (error) throw error
  return data as unknown as Empfehlung[]
}

/** Eine Anfrage senden: der Klick ist die Freigabe genau dieser Mail. */
export async function bewertungSenden(id: string): Promise<void> {
  const { error } = await db().rpc('bewertung_senden', { p_id: id })
  if (error) throw error
}

/** Anfrage nicht senden. */
export async function bewertungVerwerfen(id: string, grund?: string): Promise<void> {
  const { error } = await db().rpc('bewertung_verwerfen', { p_id: id, ...(grund ? { p_grund: grund } : {}) })
  if (error) throw error
}

/** Gutschrift als ausbezahlt bzw. verrechnet markieren (Recht «finanzen»). */
export async function empfehlungAusbezahlt(id: string): Promise<void> {
  const { error } = await db().rpc('empfehlung_ausbezahlt', { p_id: id })
  if (error) throw error
}
