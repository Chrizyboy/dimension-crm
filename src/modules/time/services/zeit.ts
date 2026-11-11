import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import { plusTage, zeitpunkt } from '../lib/zeit'
import type { AbwesenheitEingabe, Zeit, Zeiterfassung, ZeitTag } from '../types'

/**
 * Datenzugriff der Zeiterfassung. Wer was sieht (Zeit-Leitung alle, sonst nur sich selbst) und wer bewilligt,
 * entscheidet die Datenbank (`zeiterfassung`, `abwesenheit_*`, RLS auf `zeiten`/`abwesenheiten`). Gestempelt wird
 * in dieselbe Tabelle wie in «Baustelle» über `zeit_starten`/`zeit_stoppen`.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Personen mit Zeitkonto, Abwesenheiten des Jahres, offene Anträge, Feiertage und Posten in einer Abfrage. */
export async function ladeZeiterfassung(jahr: number, montag: string): Promise<Zeiterfassung> {
  const { data, error } = await db().rpc('zeiterfassung', { p_jahr: jahr, p_montag: montag })
  if (error) throw error
  return data as unknown as Zeiterfassung
}

/** Tage einer Person (Soll, Ist, Feiertag, Abwesenheit), höchstens zwei Monate. */
export async function ladeTage(person: string, von: string, bis: string): Promise<ZeitTag[]> {
  const { data, error } = await db().rpc('zeit_tage', { p_person: person, p_von: von, p_bis: bis })
  if (error) throw error
  return data as unknown as ZeitTag[]
}

/** Gestempelte Zeiten einer Person im Zeitraum (Schweizer Tage von–bis). */
export async function ladeZeiten(person: string, von: string, bis: string): Promise<Zeit[]> {
  const { data, error } = await db()
    .from('zeiten')
    .select(
      'id, person_id, start, stopp, pause_min, art, intern, projekt_id, service_fall_id, notiz, freigegeben_am, exportiert_am, projekte(nummer)',
    )
    .eq('person_id', person)
    .is('geloescht_am', null)
    .gte('start', zeitpunkt(von, '00:00'))
    .lt('start', zeitpunkt(plusTage(bis, 1), '00:00'))
    .order('start')
  if (error) throw error
  return data as unknown as Zeit[]
}

/** Stempeln auf einen internen Posten (Büro, Lager …); eine laufende Zeit endet dabei. */
export async function zeitStarten(intern: string): Promise<void> {
  const { error } = await db().rpc('zeit_starten', { p: { id: crypto.randomUUID(), intern, art: 'arbeit' } })
  if (error) throw error
}

/** Laufende Zeit stoppen, mit Pause in Minuten. */
export async function zeitStoppen(id: string, pauseMin: number): Promise<void> {
  const { error } = await db().rpc('zeit_stoppen', {
    p: { id, stopp: new Date().toISOString(), ...(pauseMin > 0 ? { pause_min: pauseMin } : {}) },
  })
  if (error) throw error
}

/** Zeit nachtragen oder korrigieren (für andere nur Zeit-Leitung; die Datenbank prüft). */
export async function zeitSpeichern(p: {
  id?: string
  person_id: string
  start: string
  stopp: string
  pause_min: number
  intern: string
  notiz: string | null
}): Promise<void> {
  const { error } = await db().rpc('zeit_speichern', { p: { ...p, art: 'arbeit' } })
  if (error) throw error
}

/** Zeit in den Papierkorb (nur nicht geprüfte; die Datenbank sperrt geprüfte und exportierte). */
export async function zeitEntfernen(id: string): Promise<void> {
  const { error } = await db().from('zeiten').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Abwesenheit erfassen oder ändern; mit Bewilligung bleibt sie «beantragt». */
export async function abwesenheitSpeichern(a: AbwesenheitEingabe): Promise<string> {
  const { data, error } = await db().rpc('abwesenheit_speichern', { p: a as unknown as Json })
  if (error) throw error
  return data
}

/** Antrag bewilligen oder ablehnen (mit Grund). */
export async function abwesenheitEntscheiden(id: string, bewilligt: boolean, grund?: string): Promise<void> {
  const { error } = await db().rpc('abwesenheit_entscheiden', {
    p_id: id,
    p_bewilligt: bewilligt,
    ...(grund ? { p_grund: grund } : {}),
  })
  if (error) throw error
}

/** Abwesenheit zurückziehen (Papierkorb). */
export async function abwesenheitZurueckziehen(id: string): Promise<void> {
  const { error } = await db().rpc('abwesenheit_zurueckziehen', { p_id: id })
  if (error) throw error
}

/** Übertrag aus dem Vorjahr: Ferientage und Saldo in Minuten. */
export async function zeitkontoSetzen(person: string, jahr: number, ferien: number, saldoMin: number): Promise<void> {
  const { error } = await db().rpc('zeitkonto_setzen', {
    p_person: person,
    p_jahr: jahr,
    p_ferien: ferien,
    p_saldo_min: saldoMin,
  })
  if (error) throw error
}

/** Einstellungen der Zeiterfassung (einstellungen.zeiterfassung). */
export interface ZeitEinstellungen {
  leitung: string[]
  wochenstunden: number
  ferientage: number
  aktiv_seit: string
  feiertage: Record<string, string[]>
}

/** Einstellungen und aktive Personen (Kürzel, Name) für die Auswahl der Zeit-Leitung. */
export async function ladeEinstellungen(): Promise<{
  wert: ZeitEinstellungen
  personen: { kuerzel: string; name: string }[]
}> {
  const [e, p] = await Promise.all([
    db().from('einstellungen').select('wert').eq('schluessel', 'zeiterfassung').maybeSingle(),
    db().from('personen').select('kuerzel, name').eq('aktiv', true).is('geloescht_am', null).order('name'),
  ])
  if (e.error) throw e.error
  if (p.error) throw p.error
  return { wert: e.data?.wert as unknown as ZeitEinstellungen, personen: p.data }
}

/** Einstellungen speichern (nur Administration; die Datenbank sperrt alle anderen). */
export async function einstellungenSpeichern(wert: ZeitEinstellungen): Promise<void> {
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: wert as unknown as { [k: string]: Json } })
    .eq('schluessel', 'zeiterfassung')
  if (error) throw error
}
