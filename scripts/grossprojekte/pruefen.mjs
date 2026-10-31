// Prüft den Grossprojekt-Monitor (Phase 8c) von Anfang bis Ende gegen einen Ersatz-Server für api3.geo.admin.ch
// (npm run grossprojekte:pruefen): Adresssuche, sonnendach.ch und Gebäuderegister. Startet die Edge Functions lokal,
// meldet sich als admin@test.local an, ruft «Gebäudedaten holen» und den Zeitplan auf und prüft, was in der Datenbank
// ankommt. Der echte Dienst ist in der Cloud-Umgebung gesperrt; die Testdaten sind erfunden.

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API = 'http://127.0.0.1:54321'
const MAILPIT = 'http://127.0.0.1:54324'
const PORT = 54397
const EMAIL = 'admin@test.local'
const HOST = process.env.ERSATZ_HOST ?? 'host.docker.internal'
const LAUF = randomBytes(3).toString('hex')
const ZEITPLAN = randomBytes(24).toString('hex')

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

// --- Ersatz für api3.geo.admin.ch ------------------------------------------------------------------------
// Industriestrasse: grosses Dach (zwei geeignete Flächen, eine ungeeignete), Ölheizung von 1996, Industrie.
// Parzelle 777 in Muri: nur über die Parzellensuche zu finden. Alles andere: Adresse unbekannt.
const z = { aus: false, aufrufe: [] }
const lage = { x: 1236000, y: 2668000 } // wie beim Bund: x = Nord, y = Ost
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://ersatz')
  const q = url.searchParams
  z.aufrufe.push(`${url.pathname}?${q.get('origins') ?? q.get('layers') ?? q.get('layer') ?? ''}`)
  const json = (s, d) => {
    res.writeHead(s, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(d))
  }
  if (z.aus) return json(503, { fehler: 'wartung' })
  if (url.pathname.endsWith('/SearchServer')) {
    const text = q.get('searchText') ?? ''
    if (q.get('sr') !== '2056') return json(400, {})
    if (q.get('origins') === 'address' && text.includes(`Industriestrasse ${LAUF}`))
      return json(200, { results: [{ attrs: lage }] })
    if (q.get('origins') === 'parcel' && text === 'Muri AG 777') return json(200, { results: [{ attrs: lage }] })
    return json(200, { results: [] })
  }
  if (url.pathname.endsWith('/MapServer/identify')) {
    if (q.get('layers') === 'all:ch.bfe.solarenergie-eignung-daecher') {
      return json(200, {
        results: [{ attributes: { building_id: 4711, flaeche: 900, klasse: 4, stromertrag: 150000 } }],
      })
    }
    if (q.get('layers') === 'all:ch.bfs.gebaeude_wohnungs_register') {
      return json(200, {
        results: [
          {
            attributes: {
              egid: 190000000 + 77,
              gbauj: 1979,
              gkat: 1060,
              gklas: 1251,
              genh1: 7530,
              gwaerdath1: '1996-01-01',
            },
          },
        ],
      })
    }
  }
  if (url.pathname.endsWith('/MapServer/find') && q.get('searchText') === '4711') {
    return json(200, {
      results: [
        { attributes: { building_id: 4711, flaeche: 900, klasse: 4, stromertrag: 150000 } },
        { attributes: { building_id: 4711, flaeche: 700, klasse: 5, stromertrag: 125000 } },
        { attributes: { building_id: 4711, flaeche: 250, klasse: 1, stromertrag: 15000 } },
      ],
    })
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

async function funktion(name, eingabe, token, kopf = {}) {
  const res = await fetch(`${API}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...kopf,
    },
    body: JSON.stringify(eingabe),
  })
  return { status: res.status, daten: await res.json().catch(() => null) }
}

/** Ein erfundenes Grossprojekt direkt in der Datenbank (wie vom Monitor gefunden). */
const neu = (name, felder) =>
  sql(
    `insert into public.grossprojekte (titel, quelle, quell_id, quell_url, ${Object.keys(felder).join(', ')})
     values ('Ersatz ${name} ${LAUF}', 'hand', 'ersatz-${LAUF}-${name}', 'Prüfskript', ${Object.values(felder)
       .map((w) => (typeof w === 'number' ? w : `'${w}'`))
       .join(', ')}) returning id`,
  ).split('\n')[0]
const feld = (id, spalten) => sql(`select ${spalten} from public.grossprojekte where id = '${id}'`)

const envDatei = join(tmpdir(), `crm-grossprojekte-${process.pid}.env`)
writeFileSync(envDatei, [`GEO_ADMIN_URL=http://${HOST}:${PORT}`, `ZEITPLAN_SCHLUESSEL=${ZEITPLAN}`].join('\n'))
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
    const r = await fetch(`${API}/functions/v1/grossprojekte`, { method: 'POST', body: '{}' }).catch(() => null)
    gut = r && r.status < 500 ? gut + 1 : 0
    await warte(1000)
  }
  const gross = neu('gross', {
    strasse: `Industriestrasse ${LAUF}`,
    plz: '5630',
    gemeinde: 'Muri AG',
    bauherr: 'Ersatz AG',
    bauherr_art: 'gewerbe',
  })
  const punkteVorher = Number(feld(gross, 'punkte'))

  let r = await funktion('grossprojekte', { aktion: 'anreichern', id: gross })
  ok(r.status === 401, 'Ohne Anmeldung keine Abfrage', String(r.status))
  const token = await anmelden()

  r = await funktion('grossprojekte', { aktion: 'anreichern', id: gross }, token)
  ok(r.daten?.ok && /Dach 1600 m² geeignet/.test(r.daten.meldung), 'Gebäudedaten geholt', JSON.stringify(r.daten))
  ok(
    feld(gross, `dachflaeche_m2 || '/' || dach_klasse || '/' || stromertrag_kwh`) === '1600/5/275000',
    'sonnendach.ch: nur geeignete Flächen gezählt (1600 m², Klasse 5, 275000 kWh)',
    feld(gross, `dachflaeche_m2 || '/' || dach_klasse || '/' || stromertrag_kwh`),
  )
  ok(
    feld(gross, `heizung || '/' || heizung_jahr || '/' || nutzung || '/' || baujahr || '/' || egid`) ===
      'oel/1996/industrie/1979/190000077',
    'Gebäuderegister: Ölheizung von 1996, Industrie, Baujahr, EGID',
  )
  ok(
    feld(gross, `round(lage_e) || '/' || round(lage_n)`) === '2668000/1236000',
    'Lage LV95 richtig (Ost/Nord nicht vertauscht)',
  )
  ok(
    Number(feld(gross, 'punkte')) >= punkteVorher + 50,
    'Punkte steigen mit den Gebäudedaten',
    `${punkteVorher} → ${feld(gross, 'punkte')}`,
  )
  ok(feld(gross, `schaetzung ->> 'kwp'`) === '288', 'Schätzung aus der Dachfläche (1600 m² × 0.18 = 288 kWp)')

  const parzelle = neu('parzelle', { gemeinde: 'Muri AG', plz: '5630', parzelle: '777', dachflaeche_m2: 500 })
  r = await funktion('grossprojekte', { aktion: 'anreichern', id: parzelle }, token)
  ok(r.daten?.ok, 'ohne Strasse über die Parzelle gefunden', JSON.stringify(r.daten))
  ok(
    feld(parzelle, `dachflaeche_m2 || '/' || heizung`) === '500/oel',
    'von Hand eingetragene Dachfläche bleibt, Heizung ergänzt',
  )

  const unbekannt = neu('unbekannt', { strasse: 'Nirgendweg 1', plz: '5630' })
  r = await funktion('grossprojekte', { aktion: 'anreichern', id: unbekannt }, token)
  ok(r.daten?.meldung === 'Adresse nicht gefunden', 'unbekannte Adresse wird gemeldet', JSON.stringify(r.daten))
  ok(feld(unbekannt, 'angereichert_am is not null') === 't', 'und gilt als abgefragt (kein Dauerversuch)')

  // Zeitplan: holt offene Grossprojekte und meldet starke Treffer in die Glocke. Die Datensicherung im Zeitplan würde
  // die ganze lokale Datenbank sichern: für diesen Test als «gerade gelaufen» markieren.
  sql(`insert into intern.zeitplan_laeufe (job, zuletzt_am, ok, meldung) values ('datensicherung', now(), true, 'im Test übersprungen')
       on conflict (job) do update set zuletzt_am = now(), ok = true, meldung = 'im Test übersprungen'`)
  sql(`update intern.zeitplan_laeufe set zuletzt_am = null where job = 'grossprojekte'`)
  const zweites = neu('zeitplan', {
    strasse: `Industriestrasse ${LAUF}`,
    plz: '5630',
    bauherr: 'Ersatz Genossenschaft',
    bauherr_art: 'genossenschaft',
  })
  z.aus = true
  const ausfall = neu('ausfall', { strasse: `Industriestrasse ${LAUF}`, plz: '5630' })
  r = await funktion('grossprojekte', { aktion: 'anreichern', id: ausfall }, token)
  ok(
    r.status === 502 && r.daten?.fehler === 'geo_admin',
    'Ausfall des Dienstes: kurzer Fehler für die App',
    JSON.stringify(r),
  )
  ok(feld(ausfall, 'angereichert_am is null') === 't', 'und das Grossprojekt bleibt offen für den nächsten Versuch')
  z.aus = false
  r = await funktion('zeitplan', {}, null, { 'x-zeitplan-schluessel': ZEITPLAN })
  ok(
    /angereichert/.test(r.daten?.ergebnis?.grossprojekte ?? ''),
    'Zeitplan: Job «grossprojekte» läuft',
    JSON.stringify(r.daten?.ergebnis),
  )
  ok(feld(zweites, 'dachflaeche_m2') === '1600', 'Zeitplan hat das offene Grossprojekt angereichert')
  ok(feld(ausfall, 'dachflaeche_m2') === '1600', 'und das nach dem Ausfall offene nachgeholt')
  ok(
    Number(sql(`select count(*) from public.benachrichtigungen where ziel = '/contracting?projekt=${zweites}'`)) >= 1,
    'starker Treffer steht in der Glocke',
  )
  ok(
    z.aufrufe.some((a) => a.includes('/MapServer/find')),
    'alle Dachflächen des Gebäudes über «find» geholt',
  )
} catch (f) {
  fehler++
  console.error('Abbruch:', f)
  console.error(protokoll.split('\n').slice(-30).join('\n'))
} finally {
  // Testdaten in den Papierkorb (nie hart löschen).
  sql(`update public.benachrichtigungen set ausgeblendet_am = now()
        where ziel in (select '/contracting?projekt=' || id from public.grossprojekte where quell_id like 'ersatz-${LAUF}-%')`)
  sql(`update public.grossprojekte set geloescht_am = now() where quell_id like 'ersatz-${LAUF}-%'`)
  const beendet = new Promise((r) => serve.once('exit', r))
  process.kill(-serve.pid, 'SIGINT')
  await Promise.race([beendet, warte(15000)])
  server.close()
}
console.log(
  fehler
    ? `\n${fehler} Prüfung(en) fehlgeschlagen`
    : '\nAlle Prüfungen bestanden (mit Ersatz-Server, nicht mit dem echten Dienst)',
)
process.exit(fehler ? 1 : 0)
