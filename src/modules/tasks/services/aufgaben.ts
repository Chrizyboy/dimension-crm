import { supabase } from '@/services/supabase'
import type { AufgabeEingabe } from '../schema'
import type { Aufgabe, AufgabenFilter, Person } from '../types'

/** Datenzugriff «Aufgaben». Erledigt wird mit Zeit und Person (Protokoll), gelöscht nur in den Papierkorb. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Aufgaben nach Filter; offene nach Fälligkeit, erledigte die letzten zuerst. */
export async function ladeAufgaben(f: AufgabenFilter, ichId: string | null): Promise<Aufgabe[]> {
  let q = db()
    .from('aufgaben')
    .select('id, titel, text, faellig_am, person_id, bezug_tabelle, bezug_id, lauf_id, erledigt_am, erstellt_am')
    .is('geloescht_am', null)
    .limit(500)
  if (f.wer === 'meine' && ichId) q = q.eq('person_id', ichId)
  if (f.wer === 'vergeben') {
    // Von mir erstellt, aber für jemand anderen (oder noch niemanden): «Was habe ich delegiert?»
    const { data } = await db().auth.getSession()
    q = q.eq('erstellt_von', data.session?.user.id ?? '00000000-0000-0000-0000-000000000000')
    if (ichId) q = q.or(`person_id.is.null,person_id.neq.${ichId}`)
  }
  q =
    f.stand === 'offen'
      ? q.is('erledigt_am', null).order('faellig_am', { ascending: true, nullsFirst: false })
      : q.not('erledigt_am', 'is', null).order('erledigt_am', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data
}

/** Aktive Personen für «Wer?». */
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

/** Erledigt setzen oder wieder öffnen. */
export async function setzeErledigt(id: string, erledigt: boolean, ichId: string | null): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .update(
      erledigt
        ? { erledigt_am: new Date().toISOString(), erledigt_von: ichId }
        : { erledigt_am: null, erledigt_von: null },
    )
    .eq('id', id)
  if (error) throw error
}

/** Neue Aufgabe von Hand. */
export async function legeAufgabeAn(e: AufgabeEingabe): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .insert({ titel: e.titel, text: e.text || null, faellig_am: e.faellig_am || null, person_id: e.person_id })
  if (error) throw error
}
