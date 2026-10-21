// Edge Function «health»: zeigt, dass Server-Funktionen laufen und die
// Datenbank erreichbar ist. Vorlage für alle späteren Funktionen
// (Zeitlimit, verständliche Fehlermeldung, keine Geheimnisse im Log).
// Bewusst ohne externe Pakete: startet schneller und hat nichts, was veralten kann.

const ZEITLIMIT_MS = 5000

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    return antwort(500, { ok: false, fehler: 'Server-Konfiguration fehlt' })
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/gesundheit`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(ZEITLIMIT_MS),
    })
    if (!res.ok) {
      console.error('health: Datenbank antwortet mit Status', res.status)
      return antwort(503, { ok: false, fehler: 'Datenbank nicht erreichbar' })
    }
    return antwort(200, { ok: true, datenbank: await res.json() })
  } catch (fehler) {
    console.error('health: Zeitlimit oder Netzwerkfehler', fehler instanceof Error ? fehler.name : 'unbekannt')
    return antwort(503, { ok: false, fehler: 'Datenbank nicht erreichbar' })
  }
})

function antwort(status: number, inhalt: unknown): Response {
  return new Response(JSON.stringify(inhalt), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
