import { supabase } from '@/services/supabase'
import type { Subauftrag, Subunternehmer } from '../types'

/** Subunternehmer und ihre Aufträge je Projekt (ERP-Erweiterung, Entscheid 0009). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alle Subunternehmer, aktive zuerst. */
export async function ladeSubunternehmer(): Promise<Subunternehmer[]> {
  const { data, error } = await db()
    .from('subunternehmer')
    .select('id, name, gewerk, email, telefon, sprache, aktiv, notiz')
    .is('geloescht_am', null)
    .order('aktiv', { ascending: false })
    .order('name')
  if (error) throw error
  return data as Subunternehmer[]
}

/** Subunternehmer anlegen oder ändern. */
export async function subunternehmerSpeichern(s: Omit<Subunternehmer, 'id'> & { id?: string }): Promise<void> {
  const { id, ...felder } = s
  const { error } = id
    ? await db().from('subunternehmer').update(felder).eq('id', id)
    : await db().from('subunternehmer').insert(felder)
  if (error) throw error
}

const AUFTRAG_FELDER =
  'id, subunternehmer_id, projekt_id, leistung, betrag_rappen, termin_von, termin_bis, status, notiz, angefragt_am, bestaetigt_am, sub:subunternehmer(name)'

type AuftragRoh = Omit<Subauftrag, 'subunternehmer'> & { sub: { name: string } | null }

/** Aufträge an Subunternehmer zu einem Projekt. */
export async function ladeSubauftraege(projektId: string): Promise<Subauftrag[]> {
  const { data, error } = await db()
    .from('subunternehmer_auftraege')
    .select(AUFTRAG_FELDER)
    .eq('projekt_id', projektId)
    .is('geloescht_am', null)
    .order('termin_von', { nullsFirst: false })
  if (error) throw error
  return (data as unknown as AuftragRoh[]).map(({ sub, ...a }) => ({ ...a, subunternehmer: sub?.name ?? '–' }))
}

/** Auftrag an einen Subunternehmer anlegen oder ändern. «Bestätigt» setzt das Datum dazu. */
export async function subauftragSpeichern(
  a: Omit<Subauftrag, 'id' | 'subunternehmer' | 'projekt' | 'angefragt_am'> & { id?: string },
): Promise<void> {
  const { id, bestaetigt_am, ...felder } = a
  const mehr =
    felder.status === 'bestaetigt' ? { bestaetigt_am: bestaetigt_am ?? new Date().toISOString().slice(0, 10) } : {}
  const { error } = id
    ? await db()
        .from('subunternehmer_auftraege')
        .update({ ...felder, ...mehr })
        .eq('id', id)
    : await db()
        .from('subunternehmer_auftraege')
        .insert({ ...felder, ...mehr })
  if (error) throw error
}

/** Anfrage ist im Ausgangskorb: Datum merken. */
export async function subauftragAngefragt(id: string): Promise<void> {
  const { error } = await db()
    .from('subunternehmer_auftraege')
    .update({ angefragt_am: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
  if (error) throw error
}

/** Auftrag in den Papierkorb. */
export async function subauftragEntfernen(id: string): Promise<void> {
  const { error } = await db()
    .from('subunternehmer_auftraege')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
