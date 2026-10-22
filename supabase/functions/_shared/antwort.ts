// Antworten der Edge Functions an die App: JSON, CORS (App läuft als Tauri-Datei oder PWA) und kurze
// Fehlercodes, die die App übersetzt. Nie Geheimnisse oder fremde Fehltexte mit Inhalt zurückgeben.

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/** JSON-Antwort mit CORS. */
export function antwort(status: number, inhalt: unknown): Response {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** Fehler in eine Antwort übersetzen: bekannte Codes durchreichen, Unbekanntes als «intern». */
export function fehlerAntwort(f: unknown): Response {
  const meldung = f instanceof Error ? f.message : String(f)
  if (meldung.startsWith('konfiguration:')) return antwort(503, { ok: false, fehler: 'nicht_eingerichtet' })
  const code = (f as { code?: unknown } | null)?.code
  const status = (f as { status?: unknown } | null)?.status
  if (typeof code === 'string') {
    return antwort(code === 'kein_recht' ? 403 : 502, {
      ok: false,
      fehler: code,
      ...(typeof status === 'number' && status > 0 ? { status } : {}),
    })
  }
  console.error('intern', f instanceof Error ? f.name : 'unbekannt')
  return antwort(500, { ok: false, fehler: 'intern' })
}
