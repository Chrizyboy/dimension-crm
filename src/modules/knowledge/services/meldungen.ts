import { supabase } from '@/services/supabase'
import type { HandbuchDatei, HelpdeskStand, Meldung, MeldungStatus, NeueMeldung } from '../types'
import { dateiAblegen } from './handbuch'

/**
 * Meldungen («Fehler melden», V233 Helpdesk-Tickets). Jede Person sieht ihre eigenen, die Administration alle;
 * Status und Antwort setzt nur die Administration. Die Glocke meldet beides (Datenbank-Funktionen).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Meldungen, die die Person sehen darf, neueste zuerst. */
export async function ladeMeldungen(): Promise<Meldung[]> {
  const { data, error } = await db()
    .from('rueckmeldungen')
    .select(
      'id, nummer, titel, text, erwartet, bereich, prio, status, antwort, antwort_von, beantwortet_am, umgebung, ' +
        'person_id, erstellt_am, einschaetzung, entscheid, entscheid_notiz, entschieden_am, umgesetzt_in, ' +
        'person:personen!rueckmeldungen_person_id_fkey(name)',
    )
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data as unknown as (Omit<Meldung, 'person'> & { person: { name: string } | null })[]).map((m) => ({
    ...m,
    person: m.person?.name ?? null,
  }))
}

/** Was ohne Nachfragen hilft, einen Fehler nachzustellen: Browser, Fenstergrösse, Sprache, Adresse. */
export function umgebung(sprache: string): string {
  const fenster = `${String(window.innerWidth)}×${String(window.innerHeight)}`
  return [navigator.userAgent.slice(0, 160), fenster, sprache, window.location.hash.split('?')[0]].join(' · ')
}

/** Meldung absenden; Bildschirmfotos und Dateien hängen danach an der Meldung. */
export async function melden(n: NeueMeldung, sprache: string): Promise<{ id: string; nummer: number }> {
  const { data, error } = await db().rpc('rueckmeldung_melden', {
    p_titel: n.titel,
    p_text: n.text,
    p_erwartet: n.erwartet,
    p_bereich: n.bereich,
    p_prio: n.prio,
    p_umgebung: umgebung(sprache),
  })
  if (error) throw error
  const r = data as { id: string; nummer: number }
  for (const datei of n.dateien) {
    const id = await dateiAblegen(datei, datei.name)
    const v = await db()
      .from('dokumente')
      .update({ bezug_tabelle: 'rueckmeldungen', bezug_id: r.id, ordner: 'meldungen' })
      .eq('id', id)
    if (v.error) throw v.error
  }
  return r
}

/** Status setzen und antworten (nur Administration). */
export async function beantworten(id: string, status: MeldungStatus, antwort: string): Promise<void> {
  const { error } = await db().rpc('rueckmeldung_beantworten', { p_id: id, p_status: status, p_antwort: antwort })
  if (error) throw error
}

/** «Erledige es» oder «Nicht» (nur die entscheidende Person); erst danach wird etwas geändert. */
export async function entscheiden(id: string, entscheid: 'erledigen' | 'nicht', notiz: string): Promise<void> {
  const { error } = await db().rpc('rueckmeldung_entscheiden', { p_id: id, p_entscheid: entscheid, p_notiz: notiz })
  if (error) throw error
}

/** Wer entscheidet und ob eine SMS kommt (nur Administration). */
export async function ladeHelpdeskStand(): Promise<HelpdeskStand> {
  const { data, error } = await db().rpc('helpdesk_stand')
  if (error) throw error
  return data as unknown as HelpdeskStand
}

/** Entscheidende Person und SMS festlegen (nur Administration). */
export async function helpdeskEinstellen(personId: string | null, sms: boolean): Promise<void> {
  // null = niemand bestimmt; die erzeugten Typen kennen bei Parametern kein null.
  const { error } = await db().rpc('helpdesk_einstellen', { p_person_id: personId as string, p_sms: sms })
  if (error) throw error
}

/** Anhänge einer Meldung. */
export async function ladeAnhaenge(meldungId: string): Promise<HandbuchDatei[]> {
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name, mime_typ, bytes, speicher_pfad, sharepoint_url')
    .eq('bezug_tabelle', 'rueckmeldungen')
    .eq('bezug_id', meldungId)
    .is('geloescht_am', null)
  if (error) throw error
  return data
}
