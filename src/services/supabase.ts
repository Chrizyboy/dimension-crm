import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Gemeinsame Verbindung zu Supabase. Ist (noch) keine Adresse konfiguriert, ist sie `null` –
 * die Oberfläche zeigt dann «nicht verbunden» statt abzustürzen.
 * Der öffentliche «anon»-Schlüssel ist ungefährlich: was jemand sehen darf, regelt Row Level Security.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

/** Prüft, ob die Datenbank erreichbar ist (für die Statusanzeige). */
export async function pruefeVerbindung(): Promise<'verbunden' | 'nicht-konfiguriert' | 'fehler'> {
  if (!supabase) return 'nicht-konfiguriert'
  try {
    // Echte Abfrage statt nur Login-Status, damit «verbunden» wirklich die Datenbank meint.
    const { error } = await supabase.rpc('gesundheit')
    return error ? 'fehler' : 'verbunden'
  } catch {
    return 'fehler'
  }
}
