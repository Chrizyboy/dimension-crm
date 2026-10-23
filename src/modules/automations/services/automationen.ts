import { supabase } from '@/services/supabase'
import type { Automation, AutomationsEinstellungen, Katalog, Lauf, LaufStand } from '../types'

/**
 * Datenzugriff «Automationen». Ob eine Automation gültig ist (Auslöser, Felder, Aktionen), prüft die Datenbank
 * beim Speichern (automation_vor_speichern); Läufe ändert nur der Server, abbrechen nur die Administration.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const SPALTEN =
  'id, vorlage, name_de, name_fr, beschreibung_de, beschreibung_fr, aktiv, aktiv_seit, modus, ausloeser, bedingungen, aktionen, reihenfolge'

/** Alle Automationen (ohne Papierkorb) in der eingestellten Reihenfolge. */
export async function ladeAutomationen(): Promise<Automation[]> {
  const { data, error } = await db()
    .from('automationen')
    .select(SPALTEN)
    .is('geloescht_am', null)
    .order('reihenfolge')
    .order('name_de')
  if (error) throw error
  return data as unknown as Automation[]
}

/** Bausteine für den Editor. */
export async function ladeKatalog(): Promise<Katalog> {
  const { data, error } = await db().rpc('automation_katalog')
  if (error) throw error
  return data as unknown as Katalog
}

/** Neu anlegen (ohne id) oder ändern. Gibt die gespeicherte Automation zurück. */
export async function speichereAutomation(
  a: Omit<Automation, 'id' | 'aktiv_seit'> & { id?: string },
): Promise<Automation> {
  const { id, ...felder } = a
  const zeile = felder as never
  const abfrage = id ? db().from('automationen').update(zeile).eq('id', id) : db().from('automationen').insert(zeile)
  const { data, error } = await abfrage.select(SPALTEN).single()
  if (error) throw error
  return data as unknown as Automation
}

/** Ein- oder ausschalten; eingeschaltet zählen nur Ereignisse ab jetzt. */
export async function schalteAutomation(id: string, aktiv: boolean): Promise<void> {
  const { error } = await db().from('automationen').update({ aktiv }).eq('id', id)
  if (error) throw error
}

/** In den Papierkorb (nichts hart löschen, Regel 5). */
export async function automationInPapierkorb(id: string): Promise<void> {
  const { error } = await db().from('automationen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Filter fürs Protokoll. */
export interface LaufFilter {
  automation_id?: string
  staende?: LaufStand[]
}

/** Letzte Läufe, neueste zuerst. */
export async function ladeLaeufe(filter: LaufFilter, anzahl = 300): Promise<Lauf[]> {
  let q = db()
    .from('automation_laeufe')
    .select(
      'id, automation_id, ereignis, tabelle, bezug_id, titel, stand, schritt, weiter_am, protokoll, fehler, erstellt_am, beendet_am',
    )
    .order('erstellt_am', { ascending: false })
    .limit(anzahl)
  if (filter.automation_id) q = q.eq('automation_id', filter.automation_id)
  if (filter.staende?.length) q = q.in('stand', filter.staende)
  const { data, error } = await q
  if (error) throw error
  return data as unknown as Lauf[]
}

/** Offenen Lauf von Hand beenden. */
export async function laufAbbrechen(id: string): Promise<boolean> {
  const { data, error } = await db().rpc('automation_lauf_abbrechen', { p_lauf: id })
  if (error) throw error
  return data
}

/** Einstellungen der Auslöser nach Datum. */
export async function ladeEinstellungen(): Promise<AutomationsEinstellungen> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'automationen').single()
  if (error) throw error
  return data.wert as unknown as AutomationsEinstellungen
}

/** Einstellungen speichern (nur Administration, prüft RLS). */
export async function speichereEinstellungen(e: AutomationsEinstellungen): Promise<void> {
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: e as never })
    .eq('schluessel', 'automationen')
  if (error) throw error
}
