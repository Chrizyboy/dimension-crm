// Misst Tempo, Barrierefreiheit und Best Practices der wichtigsten Seiten mit Lighthouse, am PC und am Handy.
// Braucht die lokale Supabase (npm run db:start): Die Seiten werden angemeldet gemessen, so wie das Team sie sieht.
// Aufruf: npm run messen            (alle Seiten)
//         npm run messen -- today   (nur Seiten, deren Adresse «today» enthält)
// Ergebnis: Tabelle in der Konsole und alle Werte in messungen/lighthouse-<datum>.json.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { chromium } from '@playwright/test'

const PORT = 4175
const CDP_PORT = 9333
const BASIS = `http://localhost:${PORT}`
const MAILPIT = 'http://127.0.0.1:54324'
const PERSON = 'admin@test.local'

/** Die gemessenen Seiten: die Startseite und die Bereiche, die das Team am meisten braucht. */
const SEITEN = [
  '/#/today',
  '/#/dashboard',
  '/#/sales',
  '/#/customers',
  '/#/quotes',
  '/#/projects',
  '/#/invoices',
  '/#/fieldwork',
]

const filter = process.argv[2]
const seiten = filter ? SEITEN.filter((s) => s.includes(filter)) : SEITEN

/** Wartet, bis die Vorschau-Fassung der App antwortet. */
async function warteAufServer() {
  for (let i = 0; i < 120; i++) {
    const ok = await fetch(BASIS)
      .then((r) => r.ok)
      .catch(() => false)
    if (ok) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Die App antwortet nicht auf ${BASIS}`)
}

/** Holt den Anmeldecode aus dem lokalen Testpostfach (Mailpit). */
async function codeAus(seit) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${PERSON}`)}`)
    const daten = await res.json()
    const m = daten.messages.find((x) => Date.parse(x.Created) >= seit)
    const code = m && /\b(\d{6})\b/.exec(m.Snippet)?.[1]
    if (code) return code
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('Kein Anmeldecode in Mailpit')
}

/** Meldet die Testperson im Browserprofil an, damit Lighthouse die Seiten angemeldet sieht. */
async function anmelden(kontext) {
  const seite = kontext.pages()[0] ?? (await kontext.newPage())
  await seite.goto(BASIS)
  const seit = Date.now() - 1000
  await seite.getByLabel(/E-Mail-Adresse/).fill(PERSON)
  await seite.getByRole('button', { name: /Code per E-Mail senden/ }).click()
  await seite.getByLabel(/Code aus/).fill(await codeAus(seit))
  await seite.getByRole('button', { name: /^Anmelden$/ }).click()
  await seite.getByRole('navigation', { name: /Hauptnavigation/ }).waitFor()
  // Lighthouse öffnet eigene Tabs; die Anmeldung liegt im Profil und bleibt erhalten.
  await seite.goto('about:blank')
}

/**
 * Eine Messung; gibt die Punkte (0–100) und die wichtigsten Zeiten zurück. Vorher wird der Browser-Cache geleert
 * (die Anmeldung bleibt), damit jede Seite wie beim ersten Öffnen gemessen wird und nicht von der vorherigen profitiert.
 */
async function messe(kontext, url, geraet) {
  const cdp = await kontext.newCDPSession(kontext.pages()[0])
  await cdp.send('Network.clearBrowserCache')
  // Auch den Offline-Speicher der PWA, sonst kämen die Dateien schon aus dem Service Worker.
  await cdp.send('Storage.clearDataForOrigin', { origin: BASIS, storageTypes: 'cache_storage,service_workers' })
  await cdp.detach()
  const flags = {
    port: CDP_PORT,
    output: 'json',
    logLevel: 'error',
    disableStorageReset: true,
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
  }
  const lauf = await lighthouse(url, flags, geraet === 'pc' ? desktopConfig : undefined)
  const lhr = lauf.lhr
  if (process.env.LH_VOLL) writeFileSync(`${process.env.LH_VOLL}-${geraet}.json`, JSON.stringify(lhr))
  const punkte = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100)
  const ms = (a) => Math.round(lhr.audits[a]?.numericValue ?? 0)
  return {
    url,
    geraet,
    tempo: punkte('performance'),
    barrierefrei: punkte('accessibility'),
    praxis: punkte('best-practices'),
    fcp: ms('first-contentful-paint'),
    lcp: ms('largest-contentful-paint'),
    tbt: ms('total-blocking-time'),
    cls: Number((lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
    kb: Math.round((lhr.audits['total-byte-weight']?.numericValue ?? 0) / 1024),
    maengel: Object.values(lhr.audits)
      .filter(
        (a) => a.score !== null && a.score < 1 && lhr.categories.accessibility.auditRefs.some((r) => r.id === a.id),
      )
      .map((a) => a.id),
  }
}

const vorschau = spawn('npx', ['vite', 'preview', '--outDir', 'dist-db', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
})
const profil = mkdtempSync(join(tmpdir(), 'lh-profil-'))
let kontext
try {
  if (!existsSync('dist-db/index.html')) throw new Error('Zuerst bauen: npx vite build --outDir dist-db')
  await warteAufServer()
  kontext = await chromium.launchPersistentContext(profil, {
    headless: true,
    args: [`--remote-debugging-port=${CDP_PORT}`],
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
  })
  await anmelden(kontext)

  const ergebnisse = []
  for (const s of seiten) {
    for (const geraet of ['pc', 'handy']) {
      const e = await messe(kontext, BASIS + s, geraet)
      ergebnisse.push(e)
      console.log(
        `${geraet.padEnd(5)} ${s.padEnd(16)} Tempo ${String(e.tempo).padStart(3)}  Barrierefrei ${String(e.barrierefrei).padStart(3)}  Praxis ${String(e.praxis).padStart(3)}  LCP ${String(e.lcp).padStart(5)} ms  TBT ${String(e.tbt).padStart(4)} ms  CLS ${e.cls}  ${e.kb} KB${e.maengel.length ? `  Mängel: ${e.maengel.join(', ')}` : ''}`,
      )
    }
  }
  mkdirSync('messungen', { recursive: true })
  const datei = `messungen/lighthouse-${new Date().toISOString().slice(0, 10)}.json`
  const frueher = existsSync(datei) ? JSON.parse(readFileSync(datei, 'utf8')) : []
  writeFileSync(datei, JSON.stringify([...frueher, { am: new Date().toISOString(), ergebnisse }], null, 2))
  console.log(`\nGespeichert in ${datei}`)
} finally {
  await kontext?.close()
  vorschau.kill()
  rmSync(profil, { recursive: true, force: true })
}
