import type { MeineAnmeldung } from '@/types/anmeldung'
import type { Sprache } from '@/types/modul'
import { supabase } from './supabase'

/** Fehlerarten, die die Anmeldeseite verständlich anzeigt. */
export type Anmeldefehler = 'nicht_freigeschaltet' | 'code_falsch' | 'zu_oft' | 'netzwerk' | 'unbekannt'

/** Übersetzt Fehler von Supabase Auth in eine der bekannten Fehlerarten. */
export function anmeldefehlerVon(
  fehler: { status?: number | undefined; message?: string | undefined; code?: string | undefined } | null,
): Anmeldefehler {
  if (!fehler) return 'unbekannt'
  // 403 kommt vom Datenbank-Hook «vor_konto_anlage»: die Adresse ist nicht als Mitarbeitende erfasst.
  if (fehler.status === 403 && !/token/i.test(fehler.message ?? '')) return 'nicht_freigeschaltet'
  if (fehler.status === 429) return 'zu_oft'
  if (fehler.code === 'otp_expired' || /token|otp|expired|invalid/i.test(fehler.message ?? '')) return 'code_falsch'
  if (fehler.status === 0 || /fetch|network/i.test(fehler.message ?? '')) return 'netzwerk'
  return 'unbekannt'
}

/**
 * Schickt einen 6-stelligen Anmeldecode an die Adresse. Ein Konto entsteht dabei nur,
 * wenn die Adresse im CRM als aktive Person erfasst ist (prüft die Datenbank).
 */
export async function sendeAnmeldecode(email: string): Promise<Anmeldefehler | null> {
  if (!supabase) return 'netzwerk'
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  })
  return error ? anmeldefehlerVon(error) : null
}

/** Meldet mit dem Code aus der Mail an. */
export async function pruefeAnmeldecode(email: string, code: string): Promise<Anmeldefehler | null> {
  if (!supabase) return 'netzwerk'
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.replace(/\s/g, ''),
    type: 'email',
  })
  return error ? anmeldefehlerVon(error) : null
}

/**
 * Anmeldung mit dem Microsoft-Firmenkonto. Leitet zu Microsoft weiter und kommt danach
 * an dieselbe Adresse zurück; die Sitzung übernimmt Supabase beim Zurückkommen.
 */
export async function anmeldenMitMicrosoft(): Promise<Anmeldefehler | null> {
  if (!supabase) return 'netzwerk'
  const zurueck = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: { redirectTo: zurueck, scopes: 'email openid profile' },
  })
  return error ? anmeldefehlerVon(error) : null
}

/** Ist die Microsoft-Anmeldung auf dem Server eingeschaltet? Ohne Antwort: nein. */
export async function microsoftVerfuegbar(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) return false
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return false
    const einstellungen = (await res.json()) as { external?: Record<string, boolean> }
    return einstellungen.external?.azure === true
  } catch {
    return false
  }
}

/** Lädt Person, Rolle, Rechte und Bereiche der angemeldeten Person. null = keine aktive Person im CRM. */
export async function ladeMeineAnmeldung(): Promise<MeineAnmeldung | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('meine_anmeldung')
  if (error) throw error
  return (data as MeineAnmeldung | null) ?? null
}

/** Hält die gewählte Sprache im eigenen Profil fest, damit sie beim nächsten Start und auf dem Handy gleich ist. */
export async function speichereMeineSprache(sprache: Sprache): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('aendere_mein_konto', { p_profil: {}, p_sprache: sprache })
  if (error) throw error
}

/** Meldet ab; lokale Daten der Sitzung werden von Supabase entfernt. */
export async function abmelden(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}
