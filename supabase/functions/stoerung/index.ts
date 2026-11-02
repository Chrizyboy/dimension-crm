// Edge Function «stoerung»: nimmt Störungsmeldungen aus dem Formular der Website entgegen und legt daraus einen
// Service-Fall an (service_aus_website: Kunde und Anlage über Projektnummer oder Adresse, Glocke, Eingangs-
// bestätigung im Ausgangskorb). Aufruf von Server zu Server durch die Website (/api/lead/, type=service), ohne
// Supabase-Login, geschützt durch STOERUNG_SCHLUESSEL im Kopf «x-stoerung-schluessel». Anleitung für die
// Website: docs/website-stoerung.md.

import { antwort, CORS, fehlerAntwort } from '../_shared/antwort.ts'
import { dienst } from '../_shared/datenbank.ts'
import { koerperLesen, stoerungPruefen } from '../_shared/stoerung.ts'
import { env } from '../_shared/umgebung.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

const MAX_BYTES = 64_000

/** Vergleicht zwei Texte in gleichbleibender Zeit (Schutz gegen Raten über die Antwortzeit). */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return antwort(405, { ok: false, fehler: 'methode' })
  const schluessel = env('STOERUNG_SCHLUESSEL')
  if (!schluessel) return antwort(503, { ok: false, fehler: 'nicht_eingerichtet' })
  if (!gleich(req.headers.get('x-stoerung-schluessel') ?? '', schluessel)) {
    return antwort(401, { ok: false, fehler: 'schluessel' })
  }
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES) return antwort(413, { ok: false, fehler: 'zu_gross' })
  try {
    const daten = await koerperLesen(req).catch(() => ({}))
    const p = stoerungPruefen(daten, req.headers.get('idempotency-key'))
    if (p.art === 'spam') return antwort(200, { ok: true, verworfen: true })
    if (p.art === 'fehler') return antwort(400, { ok: false, fehler: 'unvollstaendig', felder: p.felder })
    const r = await dienst.rpc<{ id: string; nummer: string; doppelt: boolean }>('service_aus_website', {
      p: p.meldung,
    })
    return antwort(200, { ok: true, nummer: r.nummer, doppelt: r.doppelt })
  } catch (f) {
    return fehlerAntwort(f)
  }
})
