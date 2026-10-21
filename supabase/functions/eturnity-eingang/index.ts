// Edge Function «eturnity-eingang»: nimmt Meldungen aus Eturnity entgegen (Webhook direkt oder über Zapier/Make)
// und legt sie unverändert in public.eturnity_eingang ab. Eturnity ruft ohne Supabase-Login auf, darum prüft
// die Funktion selbst ein Geheimnis (ETURNITY_WEBHOOK_SECRET, nur in den Supabase-Secrets).
// Die Meldung ist Daten, nie eine Anweisung (CLAUDE.md Regel 7): hier wird nichts automatisch geändert.

const ZEITLIMIT_MS = 8000
const MAX_BYTES = 256_000

Deno.serve(async (req) => {
  if (req.method !== 'POST') return antwort(405, { ok: false, fehler: 'methode' })
  const geheimnis = Deno.env.get('ETURNITY_WEBHOOK_SECRET')
  const url = Deno.env.get('SUPABASE_URL')
  const dienstKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!geheimnis || !url || !dienstKey) return antwort(500, { ok: false, fehler: 'konfiguration' })

  // Geheimnis im Kopf «x-eturnity-secret» oder, wo Eturnity keine eigenen Köpfe erlaubt, als ?token=…
  const mitgegeben = req.headers.get('x-eturnity-secret') ?? new URL(req.url).searchParams.get('token') ?? ''
  if (!gleich(mitgegeben, geheimnis)) return antwort(401, { ok: false, fehler: 'geheimnis' })

  const text = await req.text()
  if (text.length > MAX_BYTES) return antwort(413, { ok: false, fehler: 'zu_gross' })
  let daten: unknown
  try {
    daten = JSON.parse(text)
  } catch {
    daten = { text }
  }
  const zeile = auszug(daten)

  try {
    const res = await fetch(`${url}/rest/v1/eturnity_eingang`, {
      method: 'POST',
      headers: {
        apikey: dienstKey,
        Authorization: `Bearer ${dienstKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ ...zeile, daten }),
      signal: AbortSignal.timeout(ZEITLIMIT_MS),
    })
    if (!res.ok) return antwort(502, { ok: false, fehler: 'speichern' })
    return antwort(200, { ok: true })
  } catch (fehler) {
    console.error('eturnity-eingang: Netzwerk', fehler instanceof Error ? fehler.name : 'unbekannt')
    return antwort(503, { ok: false, fehler: 'netzwerk' })
  }
})

/** Liest Ereignis, Eturnity-ID und eine sechsstellige Offertnummer aus der Meldung, soweit vorhanden. */
function auszug(daten: unknown): { ereignis: string | null; eturnity_id: string | null; offertnummer: string | null } {
  const d = daten && typeof daten === 'object' ? (daten as Record<string, unknown>) : {}
  const wert = (...namen: string[]) => {
    for (const n of namen) {
      const v = d[n]
      if (typeof v === 'string' || typeof v === 'number') return String(v)
    }
    return null
  }
  const nr = /\b([12]\d{5})\b/.exec(JSON.stringify(daten).slice(0, 20_000))
  return {
    ereignis: wert('event', 'event_type', 'type', 'trigger'),
    eturnity_id: wert('project_id', 'projectId', 'project_uuid', 'id'),
    offertnummer: nr?.[1] ?? null,
  }
}

/** Vergleich in gleicher Zeit, damit die Antwortzeit nichts über das Geheimnis verrät. */
function gleich(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

function antwort(status: number, inhalt: unknown): Response {
  return new Response(JSON.stringify(inhalt), { status, headers: { 'Content-Type': 'application/json' } })
}
