// Edge Function «abmelden»: der Abmelde-Link in Serien-Mails und Newslettern (…/abmelden?s=<Schlüssel>).
// Ohne Login (verify_jwt = false). Der Schlüssel ist zufällig je Kontakt, nie die ID. Antwort als kurzer Text in
// der Sprache des Kontakts (Supabase zeigt HTML aus Funktionen nur als Text an). Auch POST (One-Click, RFC 8058).

import { dienst } from '../_shared/datenbank.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

const TEXT = {
  de: 'Sie sind abgemeldet und erhalten von Dimension Solaire keine Werbe-Mails und Newsletter mehr.',
  fr: 'Vous êtes désinscrit·e et ne recevrez plus d’e-mails publicitaires ni de newsletter de Dimension Solaire.',
  unbekannt: 'Link ungültig / Lien non valable',
}

const text = (status: number, inhalt: string) =>
  new Response(inhalt, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return text(405, '')
  const s = new URL(req.url).searchParams.get('s') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(s)) return text(400, TEXT.unbekannt)
  try {
    const sprache = await dienst.rpc<string | null>('marketing_abmelden', { p_schluessel: s })
    if (!sprache) return text(404, TEXT.unbekannt)
    return text(200, sprache === 'fr' ? TEXT.fr : TEXT.de)
  } catch {
    console.error('abmelden', 'fehler')
    return text(500, 'Fehler / Erreur')
  }
})
