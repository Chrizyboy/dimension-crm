import { supabase } from '@/services/supabase'
import type { SmsVorlage } from './planung'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Ein Termin mit fertigem SMS-Text und dem Stand im Ausgangskorb (aus der Datenbank, V172). */
export interface SmsErinnerung {
  verkaufschance_id: string
  name: string
  telefon: string | null
  handy: boolean
  termin_am: string
  text: string
  ausgang_status: string | null
  ausgang_fehler: string | null
}

/** Termine an einem Tag (JJJJ-MM-TT) mit Text in der Sprache des Kunden. */
export async function ladeSmsErinnerungen(datum: string): Promise<SmsErinnerung[]> {
  const { data, error } = await db().rpc('sms_erinnerungen', { p_datum: datum })
  if (error) throw error
  return data
}

/**
 * Erinnerungen in den Ausgangskorb legen, schon freigegeben: die Person hat die Texte gesehen und «Senden»
 * gedrückt. Ohne `leads` alle offenen mit Handynummer. Gibt die Zahl neuer Einträge zurück.
 */
export async function smsErinnerungenSenden(datum: string, leads?: string[]): Promise<number> {
  const { data, error } = await db().rpc('sms_erinnerungen_senden', {
    p_datum: datum,
    ...(leads ? { p_leads: leads } : {}),
  })
  if (error) throw error
  return data
}

/** Automatischen Versand am Vortag ein- oder ausschalten (nur Administration). */
export async function smsAutomatikSetzen(vorlage: SmsVorlage, automatisch: boolean): Promise<void> {
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: { ...vorlage, automatisch } })
    .eq('schluessel', 'sms_erinnerung')
  if (error) throw error
}
