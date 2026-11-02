// Edge Function «zaehler»: zählt Öffnen (…/zaehler?o=<Mail>) und Klicks (…/zaehler?k=<Mail>&u=<Link>) von
// Serien-Mails und Newslettern (Entscheid 0042). Ohne Login (verify_jwt = false), wie «abmelden». Umgeleitet wird
// nur auf einen Link, der wirklich in dieser Mail steht (prüft die Datenbank), sonst kein offener Umleitungsdienst.
// Gespeichert werden nur Zeitpunkt und Link, keine IP-Adresse und kein Gerät.

import { dienst } from '../_shared/datenbank.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

// 1×1 transparentes GIF
const BILD = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0))
const ID = /^[0-9a-f-]{36}$/i

const bild = () =>
  new Response(BILD, {
    status: 200,
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('', { status: 405 })
  const p = new URL(req.url).searchParams
  const o = p.get('o')
  if (o !== null) {
    if (ID.test(o)) await dienst.rpc('marketing_zaehlen', { p_ausgang: o, p_art: 'oeffnung' }).catch(() => undefined)
    return bild()
  }
  const k = p.get('k') ?? ''
  const u = p.get('u') ?? ''
  if (!ID.test(k) || !/^https?:\/\//.test(u)) return new Response('Link ungültig / Lien non valable', { status: 400 })
  try {
    const ok = await dienst.rpc<boolean>('marketing_zaehlen', { p_ausgang: k, p_art: 'klick', p_url: u })
    if (!ok) return new Response('Link ungültig / Lien non valable', { status: 404 })
    return new Response(null, { status: 302, headers: { Location: u, 'Cache-Control': 'no-store' } })
  } catch {
    console.error('zaehler', 'fehler')
    return new Response('Fehler / Erreur', { status: 500 })
  }
})
