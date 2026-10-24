import { mailVorbereiten } from '@/services/ausgang'
import { supabase } from '@/services/supabase'
import type { MeinTag } from '../types'

/** Datenzugriff «Mein Tag»: eine Abfrage für die ganze Seite, Aufgaben abhaken, Übersicht per Mail. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alles, was heute für mich ansteht (Datenbank-Funktion `heute_fuer_mich`). */
export async function ladeMeinTag(): Promise<MeinTag> {
  const { data, error } = await db().rpc('heute_fuer_mich')
  if (error) throw error
  return data as unknown as MeinTag
}

/** Aufgabe direkt auf «Mein Tag» abhaken; wie im Modul Aufgaben mit Zeit und Person. */
export async function aufgabeErledigt(id: string, ichId: string): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .update({ erledigt_am: new Date().toISOString(), erledigt_von: ichId })
    .eq('id', id)
  if (error) throw error
}

/**
 * Übersicht als Mail an mich selbst. Der Klick auf «Senden» ist die Freigabe (Regel 6); die Mail geht über den
 * Ausgangskorb aus dem eigenen Postfach.
 */
export async function tagesMailSenden(an: string, betreff: string, text: string, sprache: 'de' | 'fr'): Promise<void> {
  await mailVorbereiten({ an, betreff, text, sprache, art: 'tagesuebersicht', anhaenge: [] }, true)
}
