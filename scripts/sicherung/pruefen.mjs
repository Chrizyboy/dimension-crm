// Prüft die Datensicherung der Phase 16 von Anfang bis Ende (npm run sicherung:pruefen): Rechte, «Jetzt sichern»,
// Datei herunterladen und lesen, Wiederherstellen (geändert → zurück, neu → Papierkorb, nichts löst Automationen
// aus, Unverändertes bleibt unberührt, vorher automatische Sicherung), automatische Sicherung im Zeitplan und
// Aufräumen nach Ablauf. Braucht die lokale Supabase (npm run db:start). Testkontakte sind erfunden und landen am
// Ende im Papierkorb. Die Kopie in SharePoint prüft npm run integrationen:pruefen (mit Ersatz-Microsoft).

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const API = 'http://127.0.0.1:54321'
const MAILPIT = 'http://127.0.0.1:54324'

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

async function sicherung(aktion, eingabe, token) {
  const res = await fetch(`${API}/functions/v1/sicherung`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ aktion, ...eingabe }),
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

const psql = (sql) =>
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-tAc', sql], {
    env: { ...process.env, PGPASSWORD: 'postgres' },
    encoding: 'utf8',
  }).trim()

/** Datei aus dem Speicher holen, wie die App es tut (mit dem Login der Person). */
const herunterladen = (pfad, token) =>
  fetch(`${API}/storage/v1/object/authenticated/sicherungen/${encodeURIComponent(pfad)}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  })

const zeitplanSchluessel = randomBytes(24).toString('hex')
const envDatei = join(tmpdir(), `crm-sicherung-${process.pid}.env`)
writeFileSync(envDatei, `ZEITPLAN_SCHLUESSEL=${zeitplanSchluessel}\n`)
const serve = spawn('node_modules/.bin/supabase', ['functions', 'serve', '--env-file', envDatei], {
  stdio: 'ignore',
  detached: true,
})
const zeitplan = async () =>
  (
    await (
      await fetch(`${API}/functions/v1/zeitplan`, {
        method: 'POST',
        headers: { 'x-zeitplan-schluessel': zeitplanSchluessel },
      })
    ).json()
  ).ergebnis ?? {}

const testKontakte = []
const testSicherungen = []
try {
  for (let i = 0, gut = 0; i < 90 && gut < 3; i++) {
    const r = await fetch(`${API}/functions/v1/sicherung`, { method: 'POST', body: '{}' }).catch(() => null)
    gut = r && r.status < 500 ? gut + 1 : 0
    await warte(1000)
  }
  const admin = await anmelden('admin@test.local')
  const verkauf = await anmelden('verkauf@test.local')

  // --- Rechte ------------------------------------------------------------------------------------------------
  let r = await sicherung('erstellen', {}, verkauf)
  ok(r.status === 403, 'Verkauf darf nicht sichern', String(r.status))
  ok((await rest('sicherungen?select=id&limit=1')) !== null, 'Tabelle sicherungen vorhanden')

  // --- Testkontakt (erfunden) und «Jetzt sichern» ------------------------------------------------------------
  const nr = Date.now().toString().slice(-6)
  const [a] = await rest('kontakte', {
    method: 'POST',
    body: JSON.stringify({ art: 'person', kontaktart: 'privat', vorname: 'Sina', nachname: `Sicherung${nr}` }),
  })
  testKontakte.push(a.id)

  const start = Date.now()
  r = await sicherung('erstellen', {}, admin)
  ok(
    r.status === 200 && r.daten?.zeilen > 1000,
    `Jetzt sichern (${Math.round((Date.now() - start) / 100) / 10} s)`,
    JSON.stringify(r.daten),
  )
  const [eins] = await rest(`sicherungen?id=eq.${r.daten?.id}&select=*`)
  testSicherungen.push(eins.id)
  ok(
    eins.status === 'ok' && eins.art === 'manuell' && eins.von_name,
    'Sicherung «ok», manuell, mit Person',
    JSON.stringify(eins),
  )
  ok(
    eins.anzahl.kontakte > 0 && eins.anzahl.offerten >= 0 && !('aenderungsprotokoll' in eins.anzahl),
    'Anzahl je Tabelle, ohne Protokoll',
  )
  ok(eins.pfad === `CRM-Backup_${eins.slot}.json.gz`, 'Dateiname wie V233', eins.pfad)

  // --- Herunterladen ------------------------------------------------------------------------------------------
  let res = await herunterladen(eins.pfad, admin)
  ok(res.ok, 'Administration lädt die Datei herunter', String(res.status))
  const inhalt = JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8'))
  ok(inhalt.format === 'dimension-crm-sicherung' && inhalt.version === 1, 'Datei: Format und Version')
  ok(
    inhalt.tabellen.kontakte.some((k) => k.id === a.id),
    'Datei enthält den Testkontakt',
  )
  res = await herunterladen(eins.pfad, verkauf)
  ok(!res.ok, 'Verkauf kann die Datei nicht herunterladen', String(res.status))

  // --- Ändern, dann wiederherstellen ---------------------------------------------------------------------------
  await rest(`kontakte?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ nachname: `Geaendert${nr}` }) })
  const [b] = await rest('kontakte', {
    method: 'POST',
    body: JSON.stringify({ art: 'person', kontaktart: 'privat', vorname: 'Nino', nachname: `Neu${nr}` }),
  })
  testKontakte.push(b.id)
  const signaleVorher = psql('select count(*) from intern.automation_signale')
  const protokollVorher = Number(psql('select max(id) from public.aenderungsprotokoll'))

  r = await sicherung('wiederherstellen', { id: eins.id }, admin)
  ok(r.daten?.fehler === 'eingabe', 'Ohne Bestätigung kein Wiederherstellen', JSON.stringify(r.daten))
  r = await sicherung('wiederherstellen', { id: eins.id, bestaetigt: true }, verkauf)
  ok(r.status === 403, 'Verkauf darf nicht wiederherstellen', String(r.status))
  r = await sicherung('wiederherstellen', { id: eins.id, bestaetigt: true }, admin)
  ok(r.status === 200 && r.daten?.anzahl?.kontakte, 'Wiederherstellen', JSON.stringify(r.daten))
  ok(
    r.daten?.anzahl?.kontakte?.zurueck >= 1 && r.daten.anzahl.kontakte.papierkorb >= 1,
    'Ergebnis je Tabelle',
    JSON.stringify(r.daten?.anzahl?.kontakte),
  )

  const [a2] = await rest(`kontakte?id=eq.${a.id}&select=nachname,geloescht_am`)
  ok(
    a2.nachname === `Sicherung${nr}` && a2.geloescht_am === null,
    'Geänderter Kontakt ist zurückgesetzt',
    JSON.stringify(a2),
  )
  const [b2] = await rest(`kontakte?id=eq.${b.id}&select=geloescht_am`)
  ok(b2.geloescht_am !== null, 'Seither neu Erfasstes liegt im Papierkorb (nicht gelöscht)')
  ok(
    psql('select count(*) from intern.automation_signale') === signaleVorher,
    'Wiederherstellen löst keine Automation aus',
  )
  const neueProtokolle = Number(psql(`select count(*) from public.aenderungsprotokoll where id > ${protokollVorher}`))
  ok(neueProtokolle <= 5, `Unverändertes bleibt unberührt (${neueProtokolle} Protokoll-Einträge)`)

  const [eins2] = await rest(`sicherungen?id=eq.${eins.id}&select=wiederhergestellt_am,wiederhergestellt_von`)
  ok(eins2.wiederhergestellt_am && eins2.wiederhergestellt_von, 'Wiederherstellung an der Sicherung vermerkt')
  const vorher = await rest(
    `sicherungen?art=eq.vor_wiederherstellung&order=begonnen_am.desc&limit=1&select=id,status,anzahl`,
  )
  testSicherungen.push(vorher[0]?.id)
  ok(vorher[0]?.status === 'ok' && vorher[0].anzahl.kontakte > 0, 'Vorher automatisch gesichert (wie V233)')

  // --- Automatisch im Zeitplan ----------------------------------------------------------------------------------
  const faellig = psql("select coalesce(public.sicherung_faellig(), '')")
  psql(`update intern.zeitplan_laeufe set zuletzt_am = null where job = 'datensicherung'`)
  let e = await zeitplan()
  if (faellig) {
    const [auto] = await rest(`sicherungen?slot=eq.${faellig}&select=id,art,status,von_name`)
    ok(
      auto?.art === 'automatisch' && auto.status === 'ok' && auto.von_name === 'Zeitplan',
      `Zeitplan sichert Termin ${faellig}`,
      e.datensicherung,
    )
  } else {
    ok(/nicht fällig/.test(e.datensicherung ?? ''), 'Zeitplan: aktueller Termin schon gesichert', e.datensicherung)
  }
  ok(psql("select coalesce(public.sicherung_faellig(), '')") === '', 'Derselbe Termin wird nicht zweimal gesichert')

  // --- Aufräumen nach Ablauf (nur die Sicherungen dieses Tests) ----------------------------------------------
  const ids = testSicherungen
    .filter(Boolean)
    .map((x) => `'${x}'`)
    .join(',')
  psql(`update public.sicherungen set begonnen_am = now() - interval '100 days' where id in (${ids})`)
  psql(`update intern.zeitplan_laeufe set zuletzt_am = null where job = 'datensicherung'`)
  e = await zeitplan()
  ok(/abgelaufen/.test(e.datensicherung ?? ''), 'Zeitplan räumt abgelaufene Sicherungen auf', e.datensicherung)
  const [weg] = await rest(`sicherungen?id=eq.${eins.id}&select=status`)
  ok(weg.status === 'abgelaufen', 'Zeile bleibt mit Stand «abgelaufen»')
  res = await herunterladen(eins.pfad, admin)
  ok(!res.ok, 'Datei ist aus dem Speicher entfernt', String(res.status))
} catch (f) {
  ok(false, 'Ablauf', f instanceof Error ? f.message : String(f))
} finally {
  if (testKontakte.length) {
    psql(
      `update public.kontakte set geloescht_am = now() where id in (${testKontakte.map((x) => `'${x}'`).join(',')}) and geloescht_am is null`,
    )
  }
  try {
    process.kill(-serve.pid)
  } catch {
    /* schon beendet */
  }
  rmSync(envDatei, { force: true })
}
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden')
process.exit(fehler ? 1 : 0)
