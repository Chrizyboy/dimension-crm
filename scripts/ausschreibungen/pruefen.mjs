// Prüft den Ausschreibungs-Monitor (Phase 8b) von Anfang bis Ende gegen Ersatz-Server für simap.ch und
// amtsblattportal.ch (npm run ausschreibungen:pruefen). Startet die Edge Functions lokal, meldet sich als
// admin@test.local an, ruft «Jetzt abrufen» und den Zeitplan auf und prüft, was in der Datenbank ankommt:
// neue Dossiers, keine Doppelten, Zuschlag schaltet die Spur um, Ausfall einer Quelle wird festgehalten.
// Die echten Quellen sind in der Cloud-Umgebung gesperrt; die Testdaten sind erfunden.

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API = 'http://127.0.0.1:54321'
const MAILPIT = 'http://127.0.0.1:54324'
const PORT = 54398
const EMAIL = 'admin@test.local'
const HOST = process.env.ERSATZ_HOST ?? 'host.docker.internal'
const LAUF = randomBytes(3).toString('hex')

const status = Object.fromEntries(
  execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
    .split('\n')
    .map((z) => /^([A-Z_]+)="?(.*?)"?$/.exec(z))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
const ANON = status.ANON_KEY

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

// --- Ersatz für simap.ch und amtsblattportal.ch --------------------------------------------------------
const z = { simapAus: false, zuschlag: false, aufrufe: [] }
const heute = new Date().toISOString().slice(0, 10)
const projekt = (id, titel, extra = {}) => ({
  id: `ersatz-${LAUF}-${id}`,
  title: { de: titel },
  projectNumber: id,
  processType: 'open',
  publicationId: `pub-${id}`,
  publicationDate: heute,
  pubType: 'tender',
  procOfficeName: { de: `Gemeinde Ersatzdorf ${LAUF}` },
  orderAddress: { city: { de: 'Lenzburg' }, canton: 'AG', postalCode: '5600' },
  ...extra,
})
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://ersatz')
  z.aufrufe.push(`${req.method} ${url.pathname}`)
  const json = (s, d, kopf = {}) => {
    res.writeHead(s, { 'Content-Type': 'application/json', ...kopf })
    res.end(JSON.stringify(d))
  }
  if (url.pathname.startsWith('/simap')) {
    if (z.simapAus) return json(503, { fehler: 'wartung' })
    if (url.pathname.endsWith('/project-search')) {
      if (!url.searchParams.get('lang')) return json(400, { errorCode: 'E0025' })
      if (url.searchParams.get('search') || url.searchParams.get('lastItem'))
        return json(200, { projects: [], pagination: {} })
      const liste = [
        projekt('pv', 'Photovoltaikanlage Schulhaus Ersatzdorf'),
        projekt(
          'el',
          'Elektroinstallationen Neubau Werkhof',
          z.zuschlag ? { pubType: 'award_tender', publicationId: 'pub-el-z' } : {},
        ),
        projekt('rein', 'Unterhaltsreinigung Verwaltung'),
        projekt('ge', 'Photovoltaïque Genève', { orderAddress: { canton: 'GE', city: { fr: 'Genève' } } }),
      ]
      return json(200, { projects: liste, pagination: { lastItem: null } }, { 'set-cookie': 'sitzung=ersatz; Path=/' })
    }
    if (url.pathname.includes('/publication-details/pub-el-z')) {
      return json(200, { decision: { vendors: [{ vendorName: `Strom Ersatz ${LAUF} AG`, rank: 1 }] } })
    }
    if (url.pathname.includes('/publication-details/')) {
      return json(200, { dates: { offerDeadline: '2099-02-01T12:00:00+01:00', qnas: [{ date: '2099-01-15' }] } })
    }
  }
  if (url.pathname === '/amtsblatt/publications') {
    if (url.searchParams.get('publicationStates') !== 'PUBLISHED') return json(401, {})
    const rubrik = url.searchParams.get('rubrics')
    return json(200, {
      content:
        rubrik === 'BP-ZH'
          ? [
              {
                meta: {
                  id: `ersatz-${LAUF}-bp1`,
                  rubric: 'BP-ZH',
                  language: 'de',
                  cantons: ['ZH'],
                  publicationDate: heute,
                },
              },
            ]
          : [],
    })
  }
  if (url.pathname.startsWith('/amtsblatt/publications/') && url.pathname.endsWith('/xml')) {
    res.writeHead(200, { 'Content-Type': 'application/xml' })
    return res.end(`<?xml version="1.0"?><BP-ZH01:publication xmlns:BP-ZH01="x"><content>
      <buildingContractor><companyName>Ersatz Immobilien ${LAUF} AG</companyName></buildingContractor>
      <projectFramer><companyName>Ersatz Architekten GmbH</companyName></projectFramer>
      <projectDescription>Neubau Mehrfamilienhaus, Flachdach</projectDescription>
      <projectLocation><swissZipCode>8810</swissZipCode><town>Horgen</town></projectLocation>
      <parcelNumber>${LAUF}</parcelNumber></content></BP-ZH01:publication>`)
  }
  json(404, {})
})
await new Promise((r) => server.listen(PORT, '0.0.0.0', r))

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

async function funktion(name, eingabe, token) {
  const res = await fetch(`${API}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eingabe),
  })
  return { status: res.status, daten: await res.json().catch(() => null) }
}

const zaehle = (bedingung) =>
  Number(sql(`select count(*) from public.ausschreibungen where quell_id like 'ersatz-${LAUF}-%' and ${bedingung}`))

const envDatei = join(tmpdir(), `crm-ausschreibungen-${process.pid}.env`)
writeFileSync(
  envDatei,
  [`SIMAP_URL=http://${HOST}:${PORT}/simap`, `AMTSBLATT_URL=http://${HOST}:${PORT}/amtsblatt`].join('\n'),
)
// Direkt das CLI starten, als eigene Prozessgruppe, damit es sich sauber beenden lässt (siehe integrationen:pruefen).
const serve = spawn('node_modules/.bin/supabase', ['functions', 'serve', '--env-file', envDatei], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})
let protokoll = ''
serve.stdout.on('data', (d) => (protokoll += d))
serve.stderr.on('data', (d) => (protokoll += d))

try {
  for (let i = 0, gut = 0; i < 90 && gut < 3; i++) {
    const r = await fetch(`${API}/functions/v1/ausschreibungen`, { method: 'POST', body: '{}' }).catch(() => null)
    gut = r && r.status < 500 ? gut + 1 : 0
    await warte(1000)
  }
  let r = await funktion('ausschreibungen', { aktion: 'lesen', quelle: 'simap' })
  ok(r.status === 401, 'Ohne Anmeldung kein Abruf', String(r.status))
  const token = await anmelden()

  r = await funktion('ausschreibungen', { aktion: 'lesen', quelle: 'simap' }, token)
  ok(r.daten?.ok && r.daten.ergebnis.ok, 'simap: Abruf läuft durch', JSON.stringify(r.daten))
  ok(
    r.daten?.ergebnis?.neu === 2,
    'simap: zwei neue Dossiers (PV und Elektro), Reinigung und Genf übersprungen',
    JSON.stringify(r.daten),
  )
  ok(
    zaehle(`spur = 'angebot' and status = 'pruefen' and frist = '2099-02-01'`) === 1,
    'PV-Ausschreibung: Spur Angebot mit Eingabefrist',
  )
  ok(zaehle(`spur = 'beobachten' and ausloeser = 'zuschlag'`) === 1, 'Elektro-Gesamtlos: beobachten bis zum Zuschlag')
  ok(
    sql(
      `select count(*) from public.kontaktsperren where wert = 'Gemeinde Ersatzdorf ${LAUF}' and aufgehoben_am is null`,
    ) === '2',
    'Vergabestelle ist für beide Dossiers gesperrt',
  )
  ok(
    z.aufrufe.some((a) => a.includes('publication-details')),
    'Details (Fristen) werden geholt',
  )

  r = await funktion('ausschreibungen', { aktion: 'lesen', quelle: 'simap' }, token)
  ok(r.daten?.ergebnis?.neu === 0 && zaehle('true') === 2, 'zweiter Abruf: nichts doppelt', JSON.stringify(r.daten))

  z.zuschlag = true
  r = await funktion('ausschreibungen', { aktion: 'lesen', quelle: 'simap' }, token)
  ok(r.daten?.ergebnis?.aktualisiert === 1, 'Zuschlag zum bekannten Projekt erkannt', JSON.stringify(r.daten))
  ok(zaehle(`spur = 'akquise' and art = 'zuschlag'`) === 1, 'nach dem Zuschlag: Spur Akquise')
  ok(
    sql(`select count(*) from public.ausschreibung_kontakte k join public.ausschreibungen a on a.id = k.ausschreibung_id
          where a.quell_id = 'ersatz-${LAUF}-el' and k.rolle = 'gewinner'`) === '1',
    'Gewinner steht als Kontakt im Dossier',
  )

  r = await funktion('ausschreibungen', { aktion: 'lesen', quelle: 'amtsblatt' }, token)
  ok(r.daten?.ergebnis?.neu === 1, 'Amtsblatt: Baugesuch eingelesen', JSON.stringify(r.daten))
  ok(
    zaehle(`art = 'baugesuch' and spur = 'akquise' and gemeinde = 'Horgen' and parzelle = '${LAUF}'`) === 1,
    'Baugesuch: Spur Akquise mit Parzelle',
  )
  ok(
    sql(`select count(*) from public.ausschreibung_kontakte k join public.ausschreibungen a on a.id = k.ausschreibung_id
          where a.quell_id = 'ersatz-${LAUF}-bp1'`) === '2',
    'Bauherrschaft und Architekt erfasst (ohne Mail: Kontakt fehlt)',
  )

  z.simapAus = true
  r = await funktion('ausschreibungen', { aktion: 'lesen', quelle: 'simap' }, token)
  ok(r.daten?.ergebnis?.ok === false, 'Ausfall der Quelle wird gemeldet', JSON.stringify(r.daten))
  ok(
    sql(`select ok from public.quellen_laeufe where quelle = 'simap' order by beginn desc limit 1`) === 'f',
    'und für die Quellen-Kontrolle festgehalten',
  )
} catch (f) {
  fehler++
  console.error('Abbruch:', f)
  console.error(protokoll.split('\n').slice(-30).join('\n'))
} finally {
  // Testdaten in den Papierkorb (nie hart löschen), Sperren aufheben.
  sql(`update public.kontaktsperren set aufgehoben_am = now(), geloescht_am = now()
        where ausschreibung_id in (select id from public.ausschreibungen where quell_id like 'ersatz-${LAUF}-%')`)
  sql(`update public.aufgaben set geloescht_am = now()
        where bezug_id in (select id from public.ausschreibungen where quell_id like 'ersatz-${LAUF}-%')`)
  sql(`update public.ausschreibung_kontakte set geloescht_am = now()
        where ausschreibung_id in (select id from public.ausschreibungen where quell_id like 'ersatz-${LAUF}-%')`)
  sql(`update public.anschreiben set geloescht_am = now()
        where ausschreibung_id in (select id from public.ausschreibungen where quell_id like 'ersatz-${LAUF}-%')`)
  sql(`update public.ausschreibungen set geloescht_am = now() where quell_id like 'ersatz-${LAUF}-%'`)
  sql(`update public.quellen_laeufe set geloescht_am = now() where beginn > now() - interval '30 minutes'`)
  const beendet = new Promise((r) => serve.once('exit', r))
  process.kill(-serve.pid, 'SIGINT')
  await Promise.race([beendet, warte(15000)])
  server.close()
}
console.log(
  fehler
    ? `\n${fehler} Prüfung(en) fehlgeschlagen`
    : '\nAlle Prüfungen bestanden (mit Ersatz-Servern, nicht mit den echten Quellen)',
)
process.exit(fehler ? 1 : 0)
