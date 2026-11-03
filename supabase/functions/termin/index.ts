// Edge Function «termin»: Termin-Link für Kunden (03.11.2026, Entscheid 0052). Die Seite /de/termin/ bzw. /fr/rendez-vous/
// auf dimension-solaire.ch fragt über ihren eigenen Server freie Zeiten ab und bucht; der Website-Server ruft hier
// von Server zu Server auf, ohne Supabase-Login, geschützt durch ANFRAGE_SCHLUESSEL im Kopf «x-anfrage-schluessel».
// Der Kunde sieht nur Vorname, Verkäufer, Ort und freie Zeiten. Regeln (Raster, Puffer, Outlook, Abwesenheit) stehen
// in der Datenbank (termin_link_zeiten, termin_link_buchen). Vertrag: docs/website-anfrage.md, Abschnitt Termin-Link.

import { antwort, CORS, fehlerAntwort } from '../_shared/antwort.ts'
import { dienst } from '../_shared/datenbank.ts'
import { koerperLesen } from '../_shared/stoerung.ts'
import { gleich, terminAnfrage } from '../_shared/termin_link.ts'
import { env } from '../_shared/umgebung.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return antwort(405, { ok: false, fehler: 'methode' })
  const schluessel = env('ANFRAGE_SCHLUESSEL')
  if (!schluessel) return antwort(503, { ok: false, fehler: 'nicht_eingerichtet' })
  if (!gleich(req.headers.get('x-anfrage-schluessel') ?? '', schluessel)) {
    return antwort(401, { ok: false, fehler: 'schluessel' })
  }
  if (Number(req.headers.get('content-length') ?? 0) > 8_000) return antwort(413, { ok: false, fehler: 'zu_gross' })
  try {
    const a = terminAnfrage(await koerperLesen(req).catch(() => ({})))
    if (a.art === 'fehler') return antwort(400, { ok: false, fehler: a.fehler })
    if (a.art === 'zeiten') {
      return antwort(200, await dienst.rpc<Record<string, unknown>>('termin_link_zeiten', { p_schluessel: a.t }))
    }
    const r = await dienst.rpc<Record<string, unknown>>('termin_link_buchen', {
      p_schluessel: a.t,
      p_beginn: a.beginn,
      p_notiz: a.notiz,
    })
    return antwort(200, r)
  } catch (f) {
    return fehlerAntwort(f)
  }
})
