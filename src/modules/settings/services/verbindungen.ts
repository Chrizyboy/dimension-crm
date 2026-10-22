import type { Json } from '@/types/datenbank'
import { supabase } from '@/services/supabase'
import type { Dienst, Integration, MsPerson, Protokolleintrag, ZeitplanLauf } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Stand und nicht geheime Einstellungen der Dienste (Microsoft, AbaNinja, SMS, Zeitplan). */
export async function ladeIntegrationen(): Promise<Integration[]> {
  const { data, error } = await db()
    .from('integrationen')
    .select('dienst, einstellungen, zuletzt_geprueft_am, zuletzt_ok, meldung')
    .order('dienst')
  if (error) throw error
  return data as Integration[]
}

/** Einstellungen eines Dienstes speichern (nur Administration; die Datenbank prüft das Recht). */
export async function speichereIntegration(dienst: Dienst, einstellungen: Record<string, unknown>): Promise<void> {
  const { error } = await db()
    .from('integrationen')
    .update({ einstellungen: einstellungen as { [k: string]: Json } })
    .eq('dienst', dienst)
  if (error) throw error
}

/** Wer im Team mit Microsoft verbunden ist. */
export async function ladeMsPersonen(): Promise<MsPerson[]> {
  const { data, error } = await db().rpc('microsoft_verbindungen')
  if (error) throw error
  return data
}

/** Letzte Läufe der Hintergrund-Jobs (Senden, SMS-Erinnerung, Anfragen, Kalender, Mails, Sicherung). */
export async function ladeZeitplan(): Promise<ZeitplanLauf[]> {
  const { data, error } = await db().rpc('zeitplan_laeufe')
  if (error) throw error
  return data
}

/** Die letzten Aufrufe der fremden Dienste (ohne Inhalte), neueste zuerst. */
export async function ladeProtokoll(): Promise<Protokolleintrag[]> {
  const { data, error } = await db()
    .from('integrations_protokoll')
    .select('id, zeitpunkt, dienst, aktion, ok, status, dauer_ms, meldung, person:personen(name)')
    .order('zeitpunkt', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data as unknown as (Omit<Protokolleintrag, 'person'> & { person: { name: string } | null })[]).map((z) => ({
    ...z,
    person: z.person?.name ?? null,
  }))
}
