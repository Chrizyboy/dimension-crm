import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { AufgabeEingabe } from '../schema'
import type { Ansicht, Aufgabe, AufgabeAenderung, Kommentar, Person, TeamZeile } from '../types'

/** Datenzugriff «Aufgaben». Was jemand sehen darf, entscheidet die Datenbank (RLS); gelöscht nur in den Papierkorb. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, titel, text, faellig_am, person_id, bezug_tabelle, bezug_id, bezug_name, lauf_id, erledigt_am, erledigt_von, ' +
  'erledigt_notiz, erstellt_am, ersteller_id, wichtig, teilschritte, wiederholung, herkunft, kommentare, vertretung'

/**
 * Aufgaben einer Ansicht; offene nach Fälligkeit, erledigte die letzten zuerst. `person` schränkt «alle» auf
 * eine Person ein (Klick in der Team-Sicht).
 */
export async function ladeAufgaben(ansicht: Ansicht, ichId: string | null, person?: string | null): Promise<Aufgabe[]> {
  let q = db().from('aufgaben_liste').select(FELDER).limit(1000)
  if (ansicht === 'meine' && ichId) q = q.eq('person_id', ichId)
  if (ansicht === 'vergeben' && ichId) q = q.eq('ersteller_id', ichId).or(`person_id.is.null,person_id.neq.${ichId}`)
  if (ansicht === 'vertretung') q = q.eq('vertretung', true)
  if (person) q = q.eq('person_id', person)
  q =
    ansicht === 'erledigt'
      ? q.not('erledigt_am', 'is', null).order('erledigt_am', { ascending: false }).limit(300)
      : q.is('erledigt_am', null).order('faellig_am', { ascending: true, nullsFirst: false }).order('erstellt_am')
  const { data, error } = await q
  if (error) throw error
  return data as unknown as Aufgabe[]
}

/** Eine Aufgabe (für die Akte aus einem Link, auch wenn sie nicht in der aktuellen Liste steht). */
export async function ladeAufgabe(id: string): Promise<Aufgabe | null> {
  const { data, error } = await db().from('aufgaben_liste').select(FELDER).eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as Aufgabe | null
}

/** Aktive Personen für «Für wen» und die Kürzel. */
export async function ladePersonen(): Promise<Person[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, kuerzel, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Erledigen mit optionaler Notiz (steht je nach Einstellung auch im Verlauf des Datensatzes). */
export async function erledige(id: string, notiz?: string): Promise<void> {
  const text = notiz?.trim()
  const { error } = await db().rpc('aufgabe_erledigen', { p_id: id, ...(text ? { p_notiz: text } : {}) })
  if (error) throw error
}

/** Wieder öffnen. */
export async function oeffneWieder(id: string): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .update({ erledigt_am: null, erledigt_von: null, erledigt_notiz: null })
    .eq('id', id)
  if (error) throw error
}

/** Felder ändern (Titel, Datum, Person = weitergeben, wichtig, Teilschritte, Wiederholung). */
export async function aendere(id: string, a: AufgabeAenderung): Promise<void> {
  // Teilschritte sind JSON in der Datenbank; der Typ der Tabelle kennt dafür nur «Json».
  const { teilschritte, ...rest } = a
  const { error } = await db()
    .from('aufgaben')
    .update({ ...rest, ...(teilschritte ? { teilschritte: teilschritte as unknown as NonNullable<Json> } : {}) })
    .eq('id', id)
  if (error) throw error
}

/** In den Papierkorb. */
export async function loesche(id: string): Promise<void> {
  const { error } = await db().from('aufgaben').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Neue Aufgabe (von Hand oder aus der Schnelleingabe), optional an einem Datensatz. */
export async function legeAufgabeAn(e: AufgabeEingabe): Promise<string> {
  const { data, error } = await db()
    .from('aufgaben')
    .insert({
      titel: e.titel,
      text: e.text || null,
      faellig_am: e.faellig_am || null,
      person_id: e.person_id,
      wichtig: e.wichtig ?? false,
      wiederholung: e.wiederholung || null,
      bezug_tabelle: e.bezug_tabelle ?? null,
      bezug_id: e.bezug_id ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Kommentare einer Aufgabe, älteste zuerst. */
export async function ladeKommentare(aufgabe: string): Promise<Kommentar[]> {
  const { data, error } = await db()
    .from('aufgaben_kommentare')
    .select('id, text, person_id, erstellt_am')
    .eq('aufgabe_id', aufgabe)
    .is('geloescht_am', null)
    .order('erstellt_am')
  if (error) throw error
  return data
}

/** Kommentar schreiben; «@Kurzzeichen» meldet die Person in der Glocke (Datenbank). */
export async function kommentiere(aufgabe: string, text: string): Promise<void> {
  const { error } = await db().from('aufgaben_kommentare').insert({ aufgabe_id: aufgabe, text: text.trim() })
  if (error) throw error
}

/** Team-Sicht: je Person offen, überfällig, heute, erledigt in 7 Tagen (leer ohne Recht). */
export async function ladeTeam(): Promise<TeamZeile[]> {
  const { data, error } = await db().rpc('aufgaben_team')
  if (error) throw error
  return data
}
