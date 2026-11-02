// Edge Function «anmeldemail»: «Send Email Hook» von Supabase Auth. Statt über den eingebauten Mailserver
// gehen Anmeldecode und Einladung über Microsoft Graph aus dem freigegebenen Postfach noreply@ (Chris
// 01.11.2026). Die Entra-App braucht dafür die Anwendungsberechtigung Mail.Send (docs/anmeldung.md).
// Aufruf nur durch Supabase Auth mit signiertem Aufruf (Secret ANMELDEMAIL_HOOK_SECRET), darum ohne Login.

import { baueAnmeldemail, signaturGueltig, type HookDaten } from '../_shared/anmeldemail.ts'
import { graphBasis } from '../_shared/microsoft.ts'
import { leseJson, rufe } from '../_shared/http.ts'
import { brauche, env } from '../_shared/umgebung.ts'

/** Antwort im Format, das Supabase Auth erwartet: {} bei Erfolg, sonst error mit http_code. */
function antwort(status: number, meldung?: string): Response {
  const inhalt = status === 200 ? {} : { error: { http_code: status, message: meldung ?? 'Fehler' } }
  return new Response(JSON.stringify(inhalt), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Zugangs-Token der App selbst (ohne Person), nur für den Versand aus noreply@. */
async function appToken(): Promise<string> {
  const basis = env('MS_LOGIN_URL') ?? 'https://login.microsoftonline.com'
  const res = await rufe(
    `${basis}/${brauche('MS_TENANT_ID')}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: brauche('MS_CLIENT_ID'),
        client_secret: brauche('MS_CLIENT_SECRET'),
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    },
    { versuche: 2 },
  )
  const daten = await leseJson<{ access_token?: string }>(res)
  if (!res.ok || !daten?.access_token) throw new Error(`microsoft_token:${res.status}`)
  return daten.access_token
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return antwort(405, 'methode')
  const inhalt = await req.text()
  const gueltig = await signaturGueltig(
    brauche('ANMELDEMAIL_HOOK_SECRET'),
    {
      id: req.headers.get('webhook-id'),
      zeit: req.headers.get('webhook-timestamp'),
      signatur: req.headers.get('webhook-signature'),
    },
    inhalt,
  )
  if (!gueltig) return antwort(401, 'signatur')

  try {
    const mail = baueAnmeldemail(JSON.parse(inhalt) as HookDaten)
    const absender = env('ANMELDEMAIL_ABSENDER') ?? 'noreply@dimension-solaire.ch'
    // Versand wird nie automatisch wiederholt (sonst womöglich zwei Codes); Supabase meldet den Fehler.
    const res = await rufe(
      `${graphBasis()}/users/${encodeURIComponent(absender)}/sendMail`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await appToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: mail.betreff,
            body: { contentType: 'HTML', content: mail.html },
            toRecipients: [{ emailAddress: { address: mail.an } }],
          },
          saveToSentItems: false,
        }),
      },
      { versuche: 1, zeitlimitMs: 8000 },
    )
    if (!res.ok) {
      console.error('anmeldemail: Graph', res.status)
      return antwort(502, 'versand')
    }
    return antwort(200)
  } catch (f) {
    // Nur die Art des Fehlers protokollieren, nie Adresse, Code oder Token.
    console.error('anmeldemail:', f instanceof Error ? f.message.split(':')[0] : 'unbekannt')
    return antwort(500, 'versand')
  }
})
