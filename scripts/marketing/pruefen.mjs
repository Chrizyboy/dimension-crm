// Prüft Social Media, Canva und den Abmelde-Link der Phase 11 von Anfang bis Ende gegen Ersatz-Server
// (npm run marketing:pruefen): Meta, LinkedIn und Canva verbinden (state, PKCE), Bild aus Canva holen, Post
// freigeben und sofort auf Facebook, Instagram und LinkedIn posten, geplanten Post über den Zeitplan, widerrufenes
// Token, Abmelden per Link. Braucht die lokale Supabase (npm run db:start). Echte Konten prüft dieser Test NICHT.

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { starteSocialErsatz } from './ersatz-social.mjs'

const API = 'http://127.0.0.1:54321'
const MAILPIT = 'http://127.0.0.1:54324'
const PORT = 54398
const HOST = process.env.ERSATZ_HOST ?? 'host.docker.internal'

const status = Object.fromEntries(
  execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
    .split('\n')
    .map((z) => /^([A-Z_]+)="?(.*?)"?$/.exec(z))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
const ANON = status.ANON_KEY
const DIENST = status.SERVICE_ROLE_KEY

let fehler = 0
const ok = (bedingung, text, details = '') => {
  console.log(`${bedingung ? '✓' : '✗'} ${text}${!bedingung && details ? `  → ${details}` : ''}`)
  if (!bedingung) fehler++
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms))

async function rest(pfad, init = {}) {
  const res = await fetch(`${API}/rest/v1/${pfad}`, {
    ...init,
    headers: {
      apikey: DIENST,
      Authorization: `Bearer ${DIENST}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  })
  const t = await res.text()
  if (!res.ok) throw new Error(`${pfad}: ${res.status} ${t}`)
  return t ? JSON.parse(t) : null
}
const rpc = (name, args, token) =>
  fetch(`${API}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? DIENST}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }).then(async (r) => ({ status: r.status, daten: await r.json().catch(() => null) }))

async function funktion(name, eingabe, token, koepfe = {}) {
  const res = await fetch(`${API}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...koepfe,
    },
    body: JSON.stringify(eingabe),
  })
  return { status: res.status, daten: await res.json().catch(() => null) }
}

async function anmelden(email) {
  const seit = Date.now() - 1000
  await fetch(`${API}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: false }),
  })
  for (let i = 0; i < 40; i++) {
    const r = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()
    const m = r.messages.find((x) => Date.parse(x.Created) >= seit)
    const code = m && /\b(\d{6})\b/.exec(m.Snippet)?.[1]
    if (code) {
      const v = await (
        await fetch(`${API}/auth/v1/verify`, {
          method: 'POST',
          headers: { apikey: ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', email, token: code }),
        })
      ).json()
      return v.access_token
    }
    await warte(250)
  }
  throw new Error(`Kein Anmeldecode für ${email} in Mailpit`)
}

const { zustand: z, stopp } = await starteSocialErsatz({ port: PORT, host: HOST })
const zeitplanSchluessel = randomBytes(24).toString('hex')
const envDatei = join(tmpdir(), `crm-social-${process.pid}.env`)
const E = `http://${HOST}:${PORT}`
writeFileSync(
  envDatei,
  [
    'META_APP_ID=meta-app',
    'META_APP_SECRET=meta-geheim',
    `META_URL=${E}/meta-graph`,
    `META_LOGIN_URL=${E}/meta/dialog`,
    'LINKEDIN_CLIENT_ID=li-app',
    'LINKEDIN_CLIENT_SECRET=li-geheim',
    `LINKEDIN_URL=${E}/linkedin`,
    `LINKEDIN_LOGIN_URL=${E}/linkedin-login`,
    'CANVA_CLIENT_ID=canva-app',
    'CANVA_CLIENT_SECRET=canva-geheim',
    `CANVA_URL=${E}/canva`,
    `CANVA_LOGIN_URL=${E}/canva-login`,
    `SOCIAL_RUECKRUF_URL=${API}/functions/v1/social-rueckruf`,
    // Der Ersatz-Server läuft auf diesem Rechner und holt Bilder über die lokale Adresse ab
    `SPEICHER_URL=${API}`,
    `VERBINDUNG_SCHLUESSEL=${randomBytes(32).toString('base64')}`,
    `ZEITPLAN_SCHLUESSEL=${zeitplanSchluessel}`,
  ].join('\n'),
)
const serve = spawn('node_modules/.bin/supabase', ['functions', 'serve', '--env-file', envDatei], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})
let protokoll = ''
serve.stdout.on('data', (d) => (protokoll += d))
serve.stderr.on('data', (d) => (protokoll += d))

const posts = []
let kontakt = null
try {
  for (let i = 0, gut = 0; i < 90 && gut < 3; i++) {
    const r = await fetch(`${API}/functions/v1/social`, { method: 'POST', body: '{}' }).catch(() => null)
    gut = r && r.status < 500 ? gut + 1 : 0
    await warte(1000)
  }
  const admin = await anmelden('admin@test.local')
  const verkauf = await anmelden('verkauf@test.local')

  // --- Status und Rechte ------------------------------------------------------------------------------------
  let r = await funktion('social', { aktion: 'status' }, admin)
  ok(
    r.daten?.eingerichtet?.meta && r.daten.eingerichtet.linkedin && r.daten.eingerichtet.canva,
    'Status: alle eingerichtet',
    JSON.stringify(r.daten),
  )
  r = await funktion('social', { aktion: 'status' })
  ok(r.status === 401, 'Ohne Anmeldung kein Zugriff', String(r.status))
  r = await funktion('social', { aktion: 'verbinden', dienst: 'meta' }, verkauf)
  ok(r.status === 403, 'Verbinden nur durch die Administration', String(r.status))

  // --- Verbinden: Meta, LinkedIn, Canva (state; Canva mit PKCE) -------------------------------------------------
  for (const dienst of ['meta', 'linkedin', 'canva']) {
    await funktion('social', { aktion: 'trennen', dienst }, admin)
    r = await funktion('social', { aktion: 'verbinden', dienst, sprache: 'de' }, admin)
    const adresse = new URL(r.daten?.adresse ?? 'http://x')
    ok(Boolean(adresse.searchParams.get('state')), `${dienst}: Anmelde-Adresse mit state`)
    if (dienst === 'canva') ok(adresse.searchParams.get('code_challenge_method') === 's256', 'Canva: PKCE')
    const weiter = await fetch(adresse.toString().replace(HOST, '127.0.0.1'), { redirect: 'manual' })
    const rueck = await fetch(weiter.headers.get('location'), { redirect: 'manual' })
    const text = await rueck.text()
    ok(rueck.status === 200 && text.startsWith('Verbunden'), `${dienst}: Rückruf verbunden`, `${rueck.status} ${text}`)
    const nochmal = await fetch(weiter.headers.get('location'), { redirect: 'manual' })
    ok(nochmal.status === 400, `${dienst}: derselbe Rückruf gilt nur einmal`, String(nochmal.status))
  }
  r = await rpc('social_verbindungen', {}, verkauf)
  const verb = Object.fromEntries((r.daten ?? []).map((v) => [v.dienst, v]))
  ok(
    verb.meta?.verbunden && verb.meta.name === 'Dimension Solaire (Ersatz)',
    'Meta: Seite verbunden, für alle sichtbar',
    JSON.stringify(r.daten),
  )
  ok(verb.linkedin?.verbunden && verb.canva?.verbunden, 'LinkedIn und Canva verbunden')
  r = await fetch(`${API}/rest/v1/rpc/social_konto_lesen`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${verkauf}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_dienst: 'meta' }),
  })
  ok(r.status === 401 || r.status === 403 || r.status === 404, 'Tokens für die App unsichtbar', String(r.status))

  // --- Canva: Design anlegen und Bild holen -----------------------------------------------------------------
  const [post] = await rest('social_posts', {
    method: 'POST',
    body: JSON.stringify({
      thema: 'Ersatz-Test Winterstrom',
      netzwerke: ['facebook', 'instagram', 'linkedin'],
      sprache: 'de_fr',
      texte: {
        facebook: { de: 'Winterstrom (Test)', fr: 'Électricité d’hiver' },
        instagram: { de: 'Winterstrom ☀️ #Solar', fr: 'Hiver #Solaire' },
        linkedin: { de: 'Winterstrom aus der Fassade (Test) #Solar #Muri', fr: 'Hiver #Solaire' },
      },
    }),
  })
  posts.push(post.id)
  r = await funktion('social', { aktion: 'canva_neu', format: 'hoch', titel: 'Winterstrom' }, verkauf)
  ok(
    r.daten?.adresse?.includes('canva.com/design/') && z.designs[0]?.design_type?.height === 1350,
    'Canva: Design im Hochformat angelegt',
    JSON.stringify(r.daten),
  )
  r = await funktion('social', { aktion: 'canva_holen', post_id: post.id, design_id: r.daten?.id }, verkauf)
  const bild = r.daten?.dokument_id
  ok(Boolean(bild), 'Canva: Bild ins CRM geholt', JSON.stringify(r.daten))
  const [dok] = await rest(`dokumente?id=eq.${bild}&select=ordner,mime_typ,bezug_id`)
  ok(dok?.ordner === 'marketing' && dok.bezug_id === post.id, 'Bild liegt im Ordner «marketing» beim Post')
  await rest(`social_posts?id=eq.${post.id}`, { method: 'PATCH', body: JSON.stringify({ bilder: [bild] }) })

  // --- Sofort veröffentlichen nach Freigabe ------------------------------------------------------------------
  r = await funktion('social', { aktion: 'veroeffentlichen', id: post.id }, verkauf)
  ok(r.daten?.fehler === 'social.nicht_geplant', 'Ohne Freigabe wird nichts gepostet', JSON.stringify(r.daten))
  r = await rpc('social_freigeben', { p_id: post.id }, verkauf)
  ok(r.status === 204 || r.status === 200, 'Post freigegeben', JSON.stringify(r.daten))
  r = await funktion('social', { aktion: 'veroeffentlichen', id: post.id }, verkauf)
  ok(r.daten?.status === 'veroeffentlicht', 'Post veröffentlicht', JSON.stringify(r.daten))
  ok(
    z.fb[0]?.art === 'foto' && z.fb[0].text === 'Winterstrom (Test)\n\nÉlectricité d’hiver',
    'Facebook: Foto mit Text DE+FR',
    JSON.stringify(z.fb),
  )
  ok(z.ig[0]?.veroeffentlicht && z.ig[0].bytes > 0, 'Instagram: Bild abgeholt und veröffentlicht', JSON.stringify(z.ig))
  ok(
    z.li[0]?.author === 'urn:li:organization:777' &&
      z.li[0].commentary.includes('{hashtag|\\#|Solar}') &&
      z.li[0].commentary.includes('\\(Test\\)') &&
      z.li[0].content?.media?.id === z.hochgeladen[0]?.urn,
    'LinkedIn: Firmenseite, Hashtags, maskierter Text, Bild',
    JSON.stringify(z.li[0]),
  )
  ok(r.daten?.ergebnis?.linkedin?.url?.includes('urn:li:share:'), 'Link zum Post gespeichert')
  r = await funktion('social', { aktion: 'veroeffentlichen', id: post.id }, verkauf)
  ok(r.daten?.fehler === 'social.nicht_geplant' && z.fb.length === 1, 'Kein zweites Posten')

  // --- Geplant über den Zeitplan -------------------------------------------------------------------------------
  const [geplant] = await rest('social_posts', {
    method: 'POST',
    body: JSON.stringify({
      thema: 'Ersatz-Test Tipp',
      netzwerke: ['linkedin'],
      sprache: 'de',
      texte: { linkedin: { de: 'Tipp: Eigenverbrauch' } },
    }),
  })
  posts.push(geplant.id)
  await rpc(
    'social_freigeben',
    { p_id: geplant.id, p_zeitpunkt: new Date(Date.now() + 3_600_000).toISOString() },
    verkauf,
  )
  await funktion('zeitplan', {}, null, { 'x-zeitplan-schluessel': zeitplanSchluessel })
  let [g] = await rest(`social_posts?id=eq.${geplant.id}&select=status`)
  ok(g.status === 'geplant' && z.li.length === 1, 'Zeitplan wartet bis zur geplanten Zeit')
  await rest(`social_posts?id=eq.${geplant.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ geplant_am: new Date(Date.now() - 60_000).toISOString() }),
  })
  await rest(`rpc/zeitplan_ergebnis`, {
    method: 'POST',
    body: JSON.stringify({ p_job: 'social', p_ok: true, p_meldung: '' }),
  })
  execFileSync(
    'psql',
    [
      '-h',
      '127.0.0.1',
      '-p',
      '54322',
      '-U',
      'postgres',
      '-tAc',
      "update intern.zeitplan_laeufe set zuletzt_am = null where job = 'social'",
    ],
    {
      env: { ...process.env, PGPASSWORD: 'postgres' },
    },
  )
  await funktion('zeitplan', {}, null, { 'x-zeitplan-schluessel': zeitplanSchluessel })
  ;[g] = await rest(`social_posts?id=eq.${geplant.id}&select=status`)
  ok(
    g.status === 'veroeffentlicht' && z.li.length === 2 && !z.li[1].content,
    'Zeitplan postet zur Zeit (Text ohne Bild)',
    g.status,
  )

  // --- Widerrufenes Token -----------------------------------------------------------------------------------
  z.abgelaufen.add('seite-token')
  const [kaputt] = await rest('social_posts', {
    method: 'POST',
    body: JSON.stringify({
      thema: 'Ersatz-Test Token',
      netzwerke: ['facebook'],
      sprache: 'de',
      texte: { facebook: { de: 'Hallo' } },
    }),
  })
  posts.push(kaputt.id)
  await rpc('social_freigeben', { p_id: kaputt.id }, verkauf)
  r = await funktion('social', { aktion: 'veroeffentlichen', id: kaputt.id }, verkauf)
  ok(
    r.daten?.status === 'fehler' && r.daten.ergebnis?.facebook?.fehler === 'neu_verbinden',
    'Widerrufenes Token: Fehler «neu verbinden»',
    JSON.stringify(r.daten),
  )
  r = await rpc('social_verbindungen', {}, verkauf)
  ok(r.daten?.find((v) => v.dienst === 'meta')?.fehler === 'neu_verbinden', 'Verbindung zeigt «neu verbinden»')
  r = await rpc('social_freigeben', { p_id: kaputt.id }, verkauf)
  ok(
    r.daten?.message === 'social.nicht_verbunden',
    'Ohne gültige Verbindung keine neue Freigabe',
    JSON.stringify(r.daten),
  )

  // --- Trennen ----------------------------------------------------------------------------------------------
  await funktion('social', { aktion: 'trennen', dienst: 'canva' }, admin)
  r = await rpc('social_verbindungen', {}, verkauf)
  ok(r.daten?.find((v) => v.dienst === 'canva')?.verbunden === false, 'Canva getrennt')
  r = await funktion('social', { aktion: 'canva_neu', format: 'quadrat' }, verkauf)
  ok(r.daten?.fehler === 'nicht_verbunden', 'Ohne Verbindung: «nicht verbunden»', JSON.stringify(r.daten))

  // --- Abmelden per Link ------------------------------------------------------------------------------------
  ;[kontakt] = await rest('kontakte', {
    method: 'POST',
    body: JSON.stringify({
      art: 'person',
      kontaktart: 'privat',
      vorname: 'Ina',
      nachname: 'Ersatz',
      email: 'ina@ersatz.test',
      sprache: 'fr',
    }),
  })
  let a = await fetch(`${API}/functions/v1/abmelden?s=${kontakt.abmelde_schluessel}`)
  const atext = await a.text()
  ok(
    a.status === 200 && atext.includes('désinscrit'),
    'Abmelde-Link: Bestätigung in der Sprache des Kontakts',
    `${a.status} ${atext}`,
  )
  const [k] = await rest(`kontakte?id=eq.${kontakt.id}&select=werbesperre`)
  ok(k.werbesperre === true, 'Abmelde-Link setzt «Keine Werbung»')
  a = await fetch(`${API}/functions/v1/abmelden?s=${kontakt.abmelde_schluessel}`)
  ok(a.status === 200, 'Zweiter Klick schadet nicht')
  a = await fetch(`${API}/functions/v1/abmelden?s=00000000-0000-0000-0000-000000000000`)
  ok(a.status === 404, 'Unbekannter Schlüssel: nichts passiert')
  a = await fetch(`${API}/functions/v1/abmelden?s=abc`)
  ok(a.status === 400, 'Ungültiger Schlüssel abgewiesen')
} catch (f) {
  fehler++
  console.error('✗ Abbruch:', f)
  console.error(protokoll.slice(-3000))
} finally {
  // Testdaten in den Papierkorb (nie hart löschen)
  const jetzt = JSON.stringify({ geloescht_am: new Date().toISOString() })
  if (posts.length)
    await rest(`social_posts?id=in.(${posts.join(',')})`, { method: 'PATCH', body: jetzt }).catch(() => null)
  if (kontakt) await rest(`kontakte?id=eq.${kontakt.id}`, { method: 'PATCH', body: jetzt }).catch(() => null)
  try {
    process.kill(-serve.pid, 'SIGTERM')
  } catch {
    // schon beendet
  }
  stopp()
}
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden')
process.exit(fehler ? 1 : 0)
