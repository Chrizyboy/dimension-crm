// Edge Function «microsoft-rueckruf»: Hierhin leitet Microsoft nach der Anmeldung zurück (?code=…&state=…).
// Ohne Supabase-Login (verify_jwt = false), geschützt durch state (einmalig, 10 Minuten) und PKCE.
// Supabase zeigt HTML aus Funktionen nur als Text an, darum geht es per Weiterleitung zurück in die App
// (APP_URL, z. B. die Adresse der Web-App); ohne APP_URL kommt eine kurze Textmeldung.

import { DienstFehler } from '../_shared/http.ts'
import { anmeldungAbschliessen } from '../_shared/microsoft.ts'
import { env } from '../_shared/umgebung.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

const TEXT = {
  de: { ok: 'Microsoft ist verbunden. Sie können dieses Fenster schliessen.', fehler: 'Verbindung fehlgeschlagen' },
  fr: { ok: 'Microsoft est connecté. Vous pouvez fermer cette fenêtre.', fehler: 'La connexion a échoué' },
}

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams
  let ergebnis = 'ok'
  let sprache: 'de' | 'fr' = 'de'
  try {
    if (q.get('error')) throw new DienstFehler('abgebrochen', 400, 'Abgebrochen')
    const r = await anmeldungAbschliessen(q.get('state') ?? '', q.get('code') ?? '')
    sprache = r.sprache === 'fr' ? 'fr' : 'de'
  } catch (f) {
    ergebnis = f instanceof DienstFehler ? f.code : 'intern'
    console.error('microsoft-rueckruf', ergebnis)
  }
  const app = env('APP_URL')
  if (app) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${app.replace(/\/$/, '')}/#/konto?microsoft=${encodeURIComponent(ergebnis)}` },
    })
  }
  const t = TEXT[sprache]
  return new Response(ergebnis === 'ok' ? t.ok : `${t.fehler} (${ergebnis})`, {
    status: ergebnis === 'ok' ? 200 : 400,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
