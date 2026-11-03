// Edge Function «anfrage»: nimmt Anfragen aus den Formularen der Website entgegen (Offerten-Assistent, Rückruf,
// Kontakt mit Rückrufwunsch, Rechner-Ergebnis mit Kontaktwunsch) und legt daraus sofort einen Lead an
// (lead_aus_website: Dubletten, Zuteilung nach Sprache und Region, Herkunft, Dach und Verbrauch). Aufruf von Server zu
// Server durch die Website nach dem Speichern, ohne Supabase-Login, geschützt durch ANFRAGE_SCHLUESSEL im Kopf
// «x-anfrage-schluessel». Die Eingangsbestätigung an den Kunden schickt die Website selbst. Vertrag:
// docs/website-anfrage.md.

import { antwort, CORS, fehlerAntwort } from '../_shared/antwort.ts'
import { dienst } from '../_shared/datenbank.ts'
import { koerperLesen } from '../_shared/stoerung.ts'
import { env } from '../_shared/umgebung.ts'
import { webAnfrage } from '../_shared/webanfrage.ts'

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
  const schluessel = env('ANFRAGE_SCHLUESSEL')
  if (!schluessel) return antwort(503, { ok: false, fehler: 'nicht_eingerichtet' })
  if (!gleich(req.headers.get('x-anfrage-schluessel') ?? '', schluessel)) {
    return antwort(401, { ok: false, fehler: 'schluessel' })
  }
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES) return antwort(413, { ok: false, fehler: 'zu_gross' })
  try {
    const daten = await koerperLesen(req).catch(() => ({}))
    const p = webAnfrage(daten)
    if (p.art === 'kein_lead') return antwort(200, { ok: true, lead: false, grund: p.grund })
    if (p.art === 'fehler') return antwort(400, { ok: false, fehler: 'unvollstaendig', felder: p.felder })
    const r = await dienst.rpc<{ ergebnis: string; verkaufschance_id: string }>('lead_aus_website', { p: p.lead })
    const [lead] = await dienst.lies<{ nummer: string }[]>(
      `verkaufschancen?id=eq.${encodeURIComponent(r.verkaufschance_id)}&select=nummer`,
    )
    return antwort(200, { ok: true, lead: true, nummer: lead?.nummer ?? null, ergebnis: r.ergebnis })
  } catch (f) {
    return fehlerAntwort(f)
  }
})
