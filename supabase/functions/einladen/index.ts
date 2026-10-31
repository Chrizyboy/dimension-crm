// Edge Function «einladen»: Die Administration lädt eine neue Person ins CRM ein.
// Läuft auf dem Server, weil das Anlegen eines Login-Kontos den geheimen Service-Schlüssel braucht.
// Ablauf: Aufrufer ist Admin? -> Person anlegen oder wieder aktivieren -> Einladung vermerken -> Mail senden.
// Die Mail geht nur auf Knopfdruck einer Admin-Person (CLAUDE.md Regel 6). Bewusst ohne externe Pakete.

const ZEITLIMIT_MS = 8000
const GUELTIG_TAGE = 14
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Anfrage {
  email: string
  name: string
  rolle: string
  sprache: 'de' | 'fr'
  standort_id?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return antwort(405, { ok: false, fehler: 'methode' })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const dienstKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !dienstKey) return antwort(500, { ok: false, fehler: 'konfiguration' })

  try {
    // 1. Nur Admins dürfen einladen. Geprüft mit dem Login der aufrufenden Person, nicht mit dem Service-Schlüssel.
    const ich = await rufe(url, '/rest/v1/rpc/meine_anmeldung', anonKey, req.headers.get('Authorization') ?? '', {})
    const rechte = (ich.daten as { rechte?: string[] } | null)?.rechte ?? []
    if (!ich.ok || !rechte.includes('admin')) return antwort(403, { ok: false, fehler: 'kein_recht' })
    const einladende = (ich.daten as { kuerzel: string }).kuerzel

    const eingabe = pruefe(await req.json().catch(() => null))
    if (!eingabe) return antwort(400, { ok: false, fehler: 'eingabe' })

    const dienst = `Bearer ${dienstKey}`
    // 2. Person anlegen oder (falls schon erfasst) wieder aktivieren. Die Rolle wählt die Admin-Person.
    const vorhanden = await rufe(
      url,
      `/rest/v1/personen?email=eq.${encodeURIComponent(eingabe.email)}&select=id,kuerzel`,
      dienstKey,
      dienst,
    )
    const zeilen = (vorhanden.daten as { id: string }[] | null) ?? []
    let personId = zeilen[0]?.id
    if (personId) {
      await rufe(
        url,
        `/rest/v1/personen?id=eq.${personId}`,
        dienstKey,
        dienst,
        { aktiv: true, geloescht_am: null },
        'PATCH',
      )
    } else {
      const neu = await rufe(url, '/rest/v1/personen?select=id', dienstKey, dienst, {
        kuerzel: await freiesKuerzel(url, dienstKey, eingabe.email),
        name: eingabe.name,
        email: eingabe.email,
        rolle: eingabe.rolle,
        sprache: eingabe.sprache,
        standort_id: eingabe.standort_id ?? null,
      })
      if (!neu.ok) return antwort(400, { ok: false, fehler: 'person', details: neu.daten })
      personId = (neu.daten as { id: string }[])[0]?.id
    }

    // 3. Einladung vermerken (wer, wann, gültig bis).
    const gueltigBis = new Date(Date.now() + GUELTIG_TAGE * 86_400_000).toISOString()
    await rufe(url, '/rest/v1/einladungen', dienstKey, dienst, {
      email: eingabe.email,
      name: eingabe.name,
      person_id: personId,
      eingeladen_von: einladende,
      gueltig_bis: gueltigBis,
    })

    // 4. Einladungs-Mail. Hat die Person schon ein Login, braucht sie keine Mail mehr.
    const mail = await rufe(url, '/auth/v1/invite', dienstKey, dienst, {
      email: eingabe.email,
      // Die Einladung kommt nur in der Sprache der Person (Vorlage wählt nach .Data.sprache).
      data: { name: eingabe.name, sprache: eingabe.sprache },
    })
    if (!mail.ok) {
      const schonDa = mail.status === 422
      return antwort(schonDa ? 200 : 502, {
        ok: schonDa,
        status: schonDa ? 'hat_konto' : 'mail_fehler',
        person_id: personId,
      })
    }
    return antwort(200, { ok: true, status: 'gesendet', person_id: personId, gueltig_bis: gueltigBis })
  } catch (fehler) {
    console.error('einladen: Zeitlimit oder Netzwerkfehler', fehler instanceof Error ? fehler.name : 'unbekannt')
    return antwort(503, { ok: false, fehler: 'netzwerk' })
  }
})

/** Prüft die Eingabe; E-Mail wird klein geschrieben, damit sie zum Login passt. */
function pruefe(roh: unknown): Anfrage | null {
  if (!roh || typeof roh !== 'object') return null
  const r = roh as Record<string, unknown>
  const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const rolle = typeof r.rolle === 'string' ? r.rolle : ''
  const sprache = r.sprache === 'fr' ? 'fr' : 'de'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || !rolle) return null
  const standort = typeof r.standort_id === 'string' ? r.standort_id : null
  return { email, name, rolle, sprache, standort_id: standort }
}

/** Kürzel aus dem Teil vor dem @ («vera.muster» -> «vera»), bei Bedarf mit Zahl, damit es eindeutig bleibt. */
async function freiesKuerzel(url: string, key: string, email: string): Promise<string> {
  const basis = (email.split('@')[0] ?? 'person').split(/[.\-_+]/)[0]?.replace(/[^a-z0-9]/g, '') || 'person'
  for (let i = 1; i < 50; i++) {
    const kandidat = i === 1 ? basis : `${basis}${i}`
    const r = await rufe(url, `/rest/v1/personen?kuerzel=eq.${kandidat}&select=id`, key, `Bearer ${key}`)
    if (((r.daten as unknown[] | null) ?? []).length === 0) return kandidat
  }
  return `${basis}${Date.now()}`
}

/** Ein Aufruf an Supabase mit Zeitlimit. GET ohne Inhalt, sonst POST/PATCH mit JSON. */
async function rufe(url: string, pfad: string, apikey: string, auth: string, inhalt?: unknown, methode?: string) {
  const res = await fetch(`${url}${pfad}`, {
    method: methode ?? (inhalt === undefined ? 'GET' : 'POST'),
    headers: { apikey, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: inhalt === undefined ? undefined : JSON.stringify(inhalt),
    signal: AbortSignal.timeout(ZEITLIMIT_MS),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, daten: text ? (JSON.parse(text) as unknown) : null }
}

function antwort(status: number, inhalt: unknown): Response {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
