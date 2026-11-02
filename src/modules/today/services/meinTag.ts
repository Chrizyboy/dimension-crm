import { mailVorbereiten } from '@/services/ausgang'
import { supabase } from '@/services/supabase'
import type { MeinTag, TeamPerson, ZielSchluessel } from '../types'

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

/**
 * Zeile verschieben (`tag_verschieben`): Aufgabe bekommt ein neues Fälligkeitsdatum, alles andere ist bis `bis`
 * für mich ausgeblendet. `bis` leer = wieder zeigen.
 */
export async function verschieben(art: string, id: string, bis: string | null): Promise<void> {
  const { error } = await db().rpc('tag_verschieben', { p_art: art, p_id: id, p_bis: bis as string })
  if (error) throw error
}

/** Wer ist heute wo (`team_heute`), für alle sichtbar, ohne Grund einer Abwesenheit. */
export async function ladeTeamHeute(): Promise<TeamPerson[]> {
  const { data, error } = await db().rpc('team_heute')
  if (error) throw error
  return data as unknown as TeamPerson[]
}

/** Personen mit ihren Wochenzielen, für den Dialog «Ziele festlegen». */
export async function ladeZiele(): Promise<{
  personen: { id: string; name: string; rolle: string }[]
  ziele: Record<string, Partial<Record<ZielSchluessel, number>>>
}> {
  const [p, e] = await Promise.all([
    db().from('personen').select('id, name, rolle').eq('aktiv', true).is('geloescht_am', null).order('name'),
    db().from('einstellungen').select('wert').eq('schluessel', 'kennzahlen').maybeSingle(),
  ])
  if (p.error) throw p.error
  if (e.error) throw e.error
  const wert = (e.data?.wert ?? {}) as { ziele?: Record<string, Partial<Record<ZielSchluessel, number>>> }
  return { personen: p.data, ziele: wert.ziele ?? {} }
}

/** Wochenziele einer Person speichern (`kennzahlen_ziele_setzen`, nur Administration oder Recht «finanzen»). */
export async function zieleSpeichern(person: string, ziele: Partial<Record<ZielSchluessel, number>>): Promise<void> {
  const { error } = await db().rpc('kennzahlen_ziele_setzen', { p_person: person, p_ziele: ziele })
  if (error) throw error
}
