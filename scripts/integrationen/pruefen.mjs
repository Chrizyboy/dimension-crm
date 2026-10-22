// Prüft alle Integrationen der Phase 8 von Anfang bis Ende gegen Ersatz-Server (npm run integrationen:pruefen).
// Startet die Edge Functions lokal mit Test-Zugangsdaten, meldet sich als admin@test.local an und geht jeden
// Ablauf durch: Microsoft verbinden, Kalender, Termin in Outlook, Mail mit Anhang, Mail-Verlauf, Anfragen aus
// dem Postfach, SharePoint-Sicherung, SMS, AbaNinja, Zeitplan. Braucht die lokale Supabase (npm run db:start).
// Echte Konten prüft dieser Test NICHT; dafür die Knöpfe «Testen» auf der Seite «Verbindungen».

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { starteErsatz } from './ersatz-dienste.mjs'

const API = 'http://127.0.0.1:54321'
const MAILPIT = 'http://127.0.0.1:54324'
const PORT = 54399
const EMAIL = 'admin@test.local'
const TENANT = randomUUID()
// Der Ersatz-Server läuft auf diesem Rechner; die Edge Functions laufen in Docker und erreichen ihn so:
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
const sql = (befehl) =>
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-tAc', befehl], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: 'postgres' },
  }).trim()

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

async function anmelden() {
  const seit = Date.now() - 1000
  await fetch(`${API}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, create_user: false }),
  })
  for (let i = 0; i < 40; i++) {
    const r = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${EMAIL}`)}`)).json()
    const m = r.messages.find((x) => Date.parse(x.Created) >= seit)
    const code = m && /\b(\d{6})\b/.exec(m.Snippet)?.[1]
    if (code) {
      const v = await (
        await fetch(`${API}/auth/v1/verify`, {
          method: 'POST',
          headers: { apikey: ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', email: EMAIL, token: code }),
        })
      ).json()
      return v.access_token
    }
    await warte(250)
  }
  throw new Error('Kein Anmeldecode in Mailpit')
}

const { zustand: z, stopp } = await starteErsatz({ port: PORT, tenant: TENANT, email: EMAIL })
const zeitplanSchluessel = randomBytes(24).toString('hex')
const envDatei = join(tmpdir(), `crm-ersatz-${process.pid}.env`)
writeFileSync(
  envDatei,
  [
    'MS_CLIENT_ID=ersatz-app',
    'MS_CLIENT_SECRET=ersatz-geheim',
    `MS_TENANT_ID=${TENANT}`,
    `MS_LOGIN_URL=http://${HOST}:${PORT}`,
    `MS_GRAPH_URL=http://${HOST}:${PORT}/graph`,
    `MS_RUECKRUF_URL=${API}/functions/v1/microsoft-rueckruf`,
    `VERBINDUNG_SCHLUESSEL=${randomBytes(32).toString('base64')}`,
    `ABANINJA_URL=http://${HOST}:${PORT}/aba`,
    'ABANINJA_TOKEN=aba-token',
    'ABANINJA_KONTO=konto-1',
    `ASPSMS_URL=http://${HOST}:${PORT}/sms`,
    'ASPSMS_USERKEY=ersatz',
    'ASPSMS_PASSWORT=ersatz',
    `ZEITPLAN_SCHLUESSEL=${zeitplanSchluessel}`,
  ].join('\n'),
)
const serve = spawn('npx', ['supabase', 'functions', 'serve', '--env-file', envDatei], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
let protokoll = ''
serve.stdout.on('data', (d) => (protokoll += d))
serve.stderr.on('data', (d) => (protokoll += d))

try {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${API}/functions/v1/verbindungen`, { method: 'OPTIONS' }).catch(() => null)
    if (r?.ok) break
    await warte(1000)
  }
  const token = await anmelden()
  const [ich] = await rest(`personen?email=eq.${EMAIL}&select=id`)

  // --- Testdaten: ein Lead mit Termin morgen 10 Uhr, Handynummer und Mail (erfunden) -----------------------
  const kennung = randomBytes(3).toString('hex')
  const kundenMail = `integration-${kennung}@ersatz.test`
  const lead = (
    await rpc('lead_anlegen', {
      p: {
        kontakt: { vorname: 'Ina', nachname: `Ersatz ${kennung}`, email: kundenMail, telefon: '079 555 66 77' },
        objekt: { strasse: 'Testweg 1', plz: '5630', ort: 'Muri AG' },
        lead: { quelle: 'direktkontakt' },
      },
    })
  ).daten
  const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const termin = new Date(`${morgen}T08:00:00Z`).toISOString()
  await rest(`verkaufschancen?id=eq.${lead}`, {
    method: 'PATCH',
    body: JSON.stringify({
      stufe: 'termin_vereinbart',
      termin_am: termin,
      termin_dauer_min: 90,
      tour_person_id: ich.id,
    }),
  })
  const [{ kontakt_id: kontakt }] = await rest(`verkaufschancen?id=eq.${lead}&select=kontakt_id`)

  // --- Verbindungen -------------------------------------------------------------------------------------
  let r = await funktion('verbindungen', { aktion: 'status' }, token)
  ok(
    r.daten?.eingerichtet?.microsoft && r.daten.eingerichtet.abaninja && r.daten.eingerichtet.sms,
    'Status: alle Dienste eingerichtet',
    JSON.stringify(r.daten),
  )
  r = await funktion('verbindungen', { aktion: 'status' })
  ok(r.status === 401, 'Ohne Anmeldung kein Zugriff', String(r.status))

  // --- Microsoft verbinden (OAuth mit state + PKCE) ----------------------------------------------------
  // Eine Verbindung aus einem früheren Lauf (mit anderem Schlüssel) zuerst trennen
  sql(
    `update intern.microsoft_verbindungen set token = null, getrennt_am = now() where person_id = (select id from public.personen where email = '${EMAIL}')`,
  )
  r = await funktion('microsoft', { aktion: 'testen' }, token)
  ok(r.daten?.fehler === 'nicht_verbunden', 'Ohne Verbindung: «nicht verbunden»', JSON.stringify(r.daten))
  r = await funktion('microsoft', { aktion: 'verbinden', sprache: 'de' }, token)
  const anmeldeUrl = new URL(r.daten?.adresse ?? 'http://x')
  ok(
    anmeldeUrl.searchParams.get('code_challenge_method') === 'S256' && anmeldeUrl.searchParams.get('state'),
    'Anmelde-Adresse mit state und PKCE',
  )
  const zuMs = await fetch(anmeldeUrl.toString().replace(HOST, '127.0.0.1'), { redirect: 'manual' })
  const zurueck = zuMs.headers.get('location')
  const rueck = await fetch(zurueck, { redirect: 'manual' })
  ok(rueck.status === 200, 'Rückruf: Microsoft verbunden', `${rueck.status} ${await rueck.text()}`)
  const nochmal = await fetch(zurueck, { redirect: 'manual' })
  ok(nochmal.status === 400, 'Derselbe Rückruf ein zweites Mal wird abgelehnt (state nur einmal)')
  const verbindung = (await rpc('meine_microsoft_verbindung', {}, token)).daten
  ok(verbindung?.konto === EMAIL, 'Verbindung in «Mein Konto» sichtbar (ohne Token)', JSON.stringify(verbindung))
  const roh = sql(`select token from intern.microsoft_verbindungen where person_id='${ich.id}'`)
  ok(roh.startsWith('v1.') && !roh.includes('refresh-'), 'Refresh-Token liegt nur verschlüsselt in der Datenbank')
  r = await funktion('microsoft', { aktion: 'testen' }, token)
  ok(r.daten?.konto === EMAIL, 'Microsoft testen: /me antwortet', JSON.stringify(r.daten))

  // --- Kalender ----------------------------------------------------------------------------------------
  r = await funktion('microsoft', { aktion: 'kalender_laden', tage: 7 }, token)
  ok(r.daten?.anzahl === 2, 'Kalender: 2 Termine übernommen, abgesagter weggelassen', JSON.stringify(r.daten))
  const kal = await rest(
    `kalender_eintraege?person_id=eq.${ich.id}&quelle=eq.outlook&geloescht_am=is.null&select=betreff,ganztags,plz,anzeige_als&order=betreff`,
  )
  ok(
    kal.length === 2 && kal[1].plz === '5630' && kal[0].ganztags,
    'Kalender: Ganztags und PLZ erkannt',
    JSON.stringify(kal),
  )
  r = await funktion('microsoft', { aktion: 'kalender_laden', tage: 7 }, token)
  const kal2 = await rest(`kalender_eintraege?person_id=eq.${ich.id}&quelle=eq.outlook&geloescht_am=is.null&select=id`)
  ok(kal2.length === 2, 'Kalender zweimal laden: keine Doppel', String(kal2.length))

  // --- Termin in Outlook --------------------------------------------------------------------------------
  r = await funktion(
    'microsoft',
    { aktion: 'termin_eintragen', verkaufschance_id: lead, text: 'Wir freuen uns.', kunde_einladen: true },
    token,
  )
  const ev = z.events.get(r.daten?.outlook?.olEventId)
  ok(
    ev?.showAs === 'workingElsewhere' &&
      ev.attendees?.[0]?.emailAddress?.address === kundenMail &&
      ev.start.dateTime.endsWith('T10:00:00'),
    'Termin in Outlook: Kunde eingeladen, 10:00 Ortszeit',
    JSON.stringify(r.daten),
  )
  r = await funktion('microsoft', { aktion: 'termin_eintragen', verkaufschance_id: lead, kunde_einladen: false }, token)
  ok(z.events.size === 1, 'Nochmals eintragen ändert den Termin statt einen zweiten anzulegen', String(z.events.size))
  const [{ outlook }] = await rest(`verkaufschancen?id=eq.${lead}&select=outlook`)
  ok(outlook?.olEventLink?.startsWith('https://outlook.ersatz/'), 'Link zum Outlook-Termin am Lead gespeichert')
  await funktion('microsoft', { aktion: 'kalender_laden', tage: 7 }, token)

  // --- Mail mit Anhang aus dem Ausgangskorb -------------------------------------------------------------
  const pfad = `test/${kennung}.pdf`
  await fetch(`${API}/storage/v1/object/dokumente/${pfad}`, {
    method: 'POST',
    headers: { apikey: DIENST, Authorization: `Bearer ${DIENST}`, 'Content-Type': 'application/pdf' },
    body: Buffer.from('%PDF-1.4 Ersatz'),
  })
  const [dok] = await rest('dokumente', {
    method: 'POST',
    body: JSON.stringify({
      name: `Offerte ${kennung}.pdf`,
      mime_typ: 'application/pdf',
      ordner: 'angebot',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'kontakte',
      bezug_id: kontakt,
    }),
  })
  const ohneFreigabe = (
    await rpc(
      'ausgang_anlegen',
      { p: { kanal: 'mail', an: kundenMail, betreff: 'Entwurf', text: 'x', kontakt_id: kontakt } },
      token,
    )
  ).daten
  const mitFreigabe = (
    await rpc(
      'ausgang_anlegen',
      {
        p: {
          kanal: 'mail',
          an: kundenMail,
          betreff: `Ihre Offerte ${kennung}`,
          text: 'Guten Tag\nAnbei die Offerte.',
          kontakt_id: kontakt,
          verkaufschance_id: lead,
          anhaenge: [{ dokument_id: dok.id, name: dok.name }],
          freigeben: true,
        },
      },
      token,
    )
  ).daten
  r = await funktion('ausgang', { aktion: 'senden' }, token)
  ok(r.daten?.gesendet === 1, 'Ausgangskorb: nur die freigegebene Mail geht raus', JSON.stringify(r.daten))
  const mail = z.gesendet.at(-1)
  ok(
    mail?.subject === `Ihre Offerte ${kennung}` && mail.anhaenge[0]?.bytes === 15,
    'Mail mit Anhang über Outlook gesendet',
  )
  const [a1] = await rest(`ausgangskorb?id=eq.${mitFreigabe}&select=status,extern_id`)
  const [a2] = await rest(`ausgangskorb?id=eq.${ohneFreigabe}&select=status`)
  ok(
    a1.status === 'gesendet' && a2.status === 'wartet',
    'Status: gesendet / wartet weiter auf Freigabe',
    JSON.stringify([a1, a2]),
  )
  const verlauf = await rest(`aktivitaeten?kontakt_id=eq.${kontakt}&art=eq.mail&select=richtung,mail_kennung`)
  ok(verlauf.length === 1 && verlauf[0].mail_kennung === a1.extern_id, 'Gesendete Mail steht im Kundenverlauf')

  // --- Mail-Verlauf: Antwort des Kunden, eigene Mail nicht doppelt --------------------------------------
  z.mails.push(
    {
      postfach: 'me',
      id: 'in-1',
      internetMessageId: `<antwort-${kennung}@kunde>`,
      subject: 'Re: Ihre Offerte',
      bodyPreview: 'Danke, passt.',
      receivedDateTime: new Date().toISOString(),
      from: { emailAddress: { address: kundenMail } },
      toRecipients: [{ emailAddress: { address: EMAIL } }],
    },
    {
      postfach: 'me',
      id: 'out-1',
      internetMessageId: a1.extern_id,
      subject: `Ihre Offerte ${kennung}`,
      from: { emailAddress: { address: 'chris@dimension-solaire.ch' } },
      toRecipients: [{ emailAddress: { address: kundenMail } }],
    },
  )
  r = await funktion('microsoft', { aktion: 'mails_abgleichen' }, token)
  ok(
    r.daten?.anzahl === 1,
    'Mail-Verlauf: Antwort des Kunden vermerkt, gesendete nicht doppelt',
    JSON.stringify(r.daten),
  )

  // --- Anfragen aus dem Postfach (solar-guide, Landingpage, Messe) --------------------------------------
  const sgName = `Sola ${kennung}`
  z.anfragen.push({
    postfach: 'info@dimension-solaire.ch',
    suche: 'from:anfrage@solar-guide.ch',
    id: 'sg-1',
    internetMessageId: `<sg-${kennung}@solar-guide>`,
    subject: `solar-guide.ch: Anfrage von ${sgName} in 5630 Muri AG`,
    receivedDateTime: new Date().toISOString(),
    from: { emailAddress: { address: 'anfrage@solar-guide.ch' } },
    body: {
      content: `<p>Vorname</p><p>Sola</p><p>Nachname</p><p>${kennung}</p><p>PLZ</p><p>5630</p><p>Ort</p><p>Muri AG</p><p>Welche Dachform hat das Gebäude?</p><p>Flachdach</p><p>Ihre Telefonnummer</p><p>079 444 ${kennung.slice(0, 2)} 11</p>`,
    },
  })
  r = await funktion('microsoft', { aktion: 'anfragen_abholen' }, token)
  ok(
    r.daten?.neu === 1 && r.daten.postfach_anfragen === 'ok',
    'solar-guide-Anfrage aus info@ wird Lead',
    JSON.stringify(r.daten),
  )
  r = await funktion('microsoft', { aktion: 'anfragen_abholen' }, token)
  ok(r.daten?.neu === 0, 'Dieselbe Mail nochmals: kein zweiter Lead', JSON.stringify(r.daten))
  const sgLead = await rest(`verkauf_geschaefte?name=eq.${encodeURIComponent(sgName)}&select=quelle,plz`)
  ok(
    sgLead.length === 1 && sgLead[0].quelle === 'solar_guide',
    'Lead mit Quelle solar-guide.ch',
    JSON.stringify(sgLead),
  )

  // Gespeicherte Mail (.eml) ins CRM ziehen: dieselbe Erkennung, ohne Microsoft
  const emlName = `Emil ${kennung}`
  const eml = [
    'From: Landingpage <web@dimension-solaire.ch>',
    `Message-ID: <eml-${kennung}@test>`,
    `Subject: Leads Landingpage`,
    'Content-Type: text/html; charset=utf-8',
    '',
    `<table><tr><td>Name</td><td>${emlName}</td></tr><tr><td>PLZ</td><td>1630</td></tr><tr><td>Telefon</td><td>079 555 ${kennung.slice(0, 2)} 22</td></tr></table>`,
  ].join('\r\n')
  r = await funktion('microsoft', { aktion: 'mail_einlesen', eml }, token)
  ok(r.daten?.neu === 1, '.eml-Datei: Anfrage der Landingpage wird Lead', JSON.stringify(r.daten))
  r = await funktion('microsoft', { aktion: 'mail_einlesen', eml }, token)
  ok(
    r.daten?.neu === 0 && r.daten.uebersprungen === 1,
    '.eml-Datei nochmals: kein zweiter Lead',
    JSON.stringify(r.daten),
  )

  // --- SharePoint-Sicherung -----------------------------------------------------------------------------
  r = await funktion('microsoft', { aktion: 'sharepoint_sichern', dokument_ids: [dok.id] }, token)
  const hoch = z.hochgeladen.find((h) => h.pfad.endsWith(`Offerte ${kennung}.pdf`))
  ok(
    hoch?.pfad.startsWith('Direction Interne/CRM Backups/Kunden Backup/K') && hoch.pfad.includes('/DEVIS - ANGEBOT/'),
    'Datei in SharePoint gesichert (Kundenordner/DEVIS - ANGEBOT)',
    hoch?.pfad,
  )
  const [gesichert] = await rest(`dokumente?id=eq.${dok.id}&select=sharepoint_status,sharepoint_url`)
  ok(gesichert.sharepoint_status?.ok === true && gesichert.sharepoint_url, 'Stand der Sicherung am Dokument')

  // --- SMS-Erinnerung -----------------------------------------------------------------------------------
  const liste = (await rpc('sms_erinnerungen', { p_datum: morgen }, token)).daten
  const meine = liste.find((x) => x.verkaufschance_id === lead)
  ok(
    meine?.handy && meine.text.includes('10:00'),
    'SMS-Liste: Termin morgen mit Handynummer und Text',
    JSON.stringify(meine),
  )
  const auto = await rpc('sms_erinnerungen_senden', { p_datum: morgen, p_leads: [lead], p_automatisch: true }, token)
  ok(auto.status >= 400, 'Angemeldete Person darf nicht «automatisch» senden', String(auto.status))
  const n = (await rpc('sms_erinnerungen_senden', { p_datum: morgen, p_leads: [lead] }, token)).daten
  const n2 = (await rpc('sms_erinnerungen_senden', { p_datum: morgen, p_leads: [lead] }, token)).daten
  ok(n === 1 && n2 === 0, 'SMS-Erinnerung freigegeben, zweites Mal nicht doppelt', `${n}/${n2}`)
  r = await funktion('ausgang', { aktion: 'senden' }, token)
  ok(
    z.sms.length === 1 && z.sms[0].an[0] === '+41795556677' && z.sms[0].absender === 'DimSolaire',
    'SMS über ASPSMS gesendet (+41…, Absender DimSolaire)',
    JSON.stringify(z.sms),
  )

  // --- AbaNinja -----------------------------------------------------------------------------------------
  r = await funktion('abaninja', { aktion: 'suchen', begriff: 'ersatz' }, token)
  ok(r.daten?.kunden?.[0]?.uuid === 'aba-1', 'AbaNinja: Kunde gefunden', JSON.stringify(r.daten))
  r = await funktion('abaninja', { aktion: 'anlegen', kontakt_id: kontakt }, token)
  const [mitAba] = await rest(`kontakte?id=eq.${kontakt}&select=abaninja_id`)
  ok(
    r.daten?.uuid && mitAba.abaninja_id === r.daten.uuid,
    'AbaNinja: Kunde angelegt und verknüpft',
    JSON.stringify(r.daten),
  )
  r = await funktion('abaninja', { aktion: 'anlegen', kontakt_id: kontakt }, token)
  ok(r.daten?.fehler === 'schon_verknuepft', 'AbaNinja: nicht zweimal anlegen', JSON.stringify(r.daten))
  r = await funktion('abaninja', { aktion: 'verknuepfen', kontakt_id: kontakt, uuid: 'aba-1' }, token)
  r = await funktion('abaninja', { aktion: 'rechnungen', kontakt_id: kontakt }, token)
  ok(
    r.daten?.rechnungen?.length === 1 && r.daten.rechnungen[0].offen_rappen === 250000,
    "AbaNinja: offene Rechnung des Kunden (CHF 2'500.00)",
    JSON.stringify(r.daten),
  )
  r = await funktion('abaninja', { aktion: 'aktualisieren', kontakt_id: kontakt }, token)
  ok(z.aba.geaendert.includes('aba-1'), 'AbaNinja: Adresse aktualisiert')

  // --- Tests auf der Seite «Verbindungen» --------------------------------------------------------------
  for (const d of ['microsoft', 'abaninja', 'sms']) {
    r = await funktion('verbindungen', { aktion: 'testen', dienst: d }, token)
    ok(r.daten?.ok, `Verbindungstest ${d}`, JSON.stringify(r.daten))
  }
  const [smsTest] = await rest('integrationen?dienst=eq.sms&select=zuletzt_ok,meldung')
  ok(smsTest.zuletzt_ok && smsTest.meldung === 'credits:123.5', 'Ergebnis des Tests gespeichert (SMS-Guthaben)')

  // --- Zeitplan -----------------------------------------------------------------------------------------
  // Die SharePoint-Sicherung im Zeitplan würde echte lokale Dateien nehmen: für diesen Test als «gerade gelaufen» markieren.
  sql(
    `insert into intern.zeitplan_laeufe (job, zuletzt_am, ok, meldung) values ('sicherung', now(), true, 'im Test übersprungen')
       on conflict (job) do update set zuletzt_am = now(), ok = true, meldung = 'im Test übersprungen'`,
  )
  r = await funktion('zeitplan', {}, null, { 'x-zeitplan-schluessel': 'falsch' })
  ok(r.status === 401, 'Zeitplan: falscher Schlüssel abgelehnt')
  r = await funktion('zeitplan', {}, null, { 'x-zeitplan-schluessel': zeitplanSchluessel })
  ok(r.daten?.ok && r.daten.ergebnis.ausgang, 'Zeitplan läuft durch', JSON.stringify(r.daten))

  // --- Trennen ------------------------------------------------------------------------------------------
  r = await funktion('microsoft', { aktion: 'termin_absagen', verkaufschance_id: lead }, token)
  ok(z.events.size === 0, 'Termin in Outlook abgesagt')
  await funktion('microsoft', { aktion: 'trennen' }, token)
  r = await funktion('microsoft', { aktion: 'testen' }, token)
  ok(r.daten?.fehler === 'nicht_verbunden', 'Nach dem Trennen kein Zugriff mehr auf Microsoft')

  // Testdaten in den Papierkorb (nie hart löschen)
  await rest(`verkaufschancen?id=eq.${lead}`, {
    method: 'PATCH',
    body: JSON.stringify({ geloescht_am: new Date().toISOString() }),
  })
  await rest(`kontakte?id=eq.${kontakt}`, {
    method: 'PATCH',
    body: JSON.stringify({ geloescht_am: new Date().toISOString(), abaninja_id: null }),
  })
} catch (f) {
  fehler++
  console.error('Abbruch:', f)
  console.error(protokoll.split('\n').slice(-30).join('\n'))
} finally {
  serve.kill('SIGINT')
  stopp()
}
console.log(
  fehler
    ? `\n${fehler} Prüfung(en) fehlgeschlagen`
    : '\nAlle Prüfungen bestanden (mit Ersatz-Servern, nicht mit echten Konten)',
)
process.exit(fehler ? 1 : 0)
