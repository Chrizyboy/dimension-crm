// Zugriff auf Secrets und Einstellungen der Edge Functions. Nur hier wird Deno.env gelesen, damit die
// übrigen Bausteine auch in Node-Tests laufen. Geheimnisse nie protokollieren oder zurückgeben.

declare const Deno: { env: { get(name: string): string | undefined } } | undefined

/** Wert aus der Umgebung (Deno oder Node), leer = nicht gesetzt. */
export function env(name: string): string | undefined {
  const wert =
    typeof Deno !== 'undefined'
      ? Deno.env.get(name)
      : (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env[name]
  return wert && wert.trim() ? wert.trim() : undefined
}

/** Wert, der für die Funktion zwingend ist; sonst Fehler «konfiguration» (ohne den Wert zu nennen). */
export function brauche(name: string): string {
  const wert = env(name)
  if (!wert) throw new Error(`konfiguration:${name}`)
  return wert
}

/** Welche Dienste eingerichtet sind (alle Secrets vorhanden), ohne Werte. */
export function eingerichtet(): Record<'microsoft' | 'abaninja' | 'sms', boolean> {
  return {
    microsoft: Boolean(
      env('MS_CLIENT_ID') && env('MS_CLIENT_SECRET') && env('MS_TENANT_ID') && env('VERBINDUNG_SCHLUESSEL'),
    ),
    abaninja: Boolean(env('ABANINJA_TOKEN') && env('ABANINJA_KONTO')),
    sms: Boolean(env('ASPSMS_USERKEY') && env('ASPSMS_PASSWORT')),
  }
}
