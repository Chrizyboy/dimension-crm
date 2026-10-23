// Edge Function «social-rueckruf»: Hierhin leiten Meta, LinkedIn und Canva nach der Anmeldung zurück
// (?code=…&state=…). Ohne Supabase-Login (verify_jwt = false), geschützt durch state (einmalig, 10 Minuten),
// bei Canva zusätzlich PKCE. Danach zurück in die App (APP_URL), sonst eine kurze Textmeldung.

import { DienstFehler } from '../_shared/http.ts'
import { socialAbschliessen } from '../_shared/social_konten.ts'
import { env } from '../_shared/umgebung.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

const TEXT = {
  de: { ok: 'Verbunden. Sie können dieses Fenster schliessen.', fehler: 'Verbindung fehlgeschlagen' },
  fr: { ok: 'Connecté. Vous pouvez fermer cette fenêtre.', fehler: 'La connexion a échoué' },
}

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams
  let ergebnis = 'ok'
  let sprache: 'de' | 'fr' = 'de'
  let dienst = ''
  try {
    if (q.get('error')) throw new DienstFehler('abgebrochen', 400, 'Abgebrochen')
    const r = await socialAbschliessen(q.get('state') ?? '', q.get('code') ?? '')
    sprache = r.sprache === 'fr' ? 'fr' : 'de'
    dienst = r.dienst
  } catch (f) {
    ergebnis = f instanceof DienstFehler ? f.code : 'intern'
    console.error('social-rueckruf', ergebnis)
  }
  const app = env('APP_URL')
  if (app) {
    const ziel = `${app.replace(/\/$/, '')}/#/marketing?ansicht=social&verbunden=${encodeURIComponent(dienst || '-')}&ergebnis=${encodeURIComponent(ergebnis)}`
    return new Response(null, { status: 302, headers: { Location: ziel } })
  }
  const t = TEXT[sprache]
  return new Response(ergebnis === 'ok' ? t.ok : `${t.fehler} (${ergebnis})`, {
    status: ergebnis === 'ok' ? 200 : 400,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
