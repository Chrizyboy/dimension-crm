#!/usr/bin/env node
// Abgleich alt gegen neu: vergleicht jeden Datensatz und jede Kennzahl der Vorlage V233 mit dem neuen CRM
// und prüft die alten Daten auf Plausibilität. Liest nur, schreibt nichts in die Datenbank.
//
//   SUPABASE_SERVICE_ROLE_KEY=… npm run import:abgleich -- "CRM-Umzug.zip" [--bericht abgleich.md] [--heute 2026-10-31]
//
// Gegen die Cloud: SUPABASE_URL=https://….supabase.co dazu. Der Schlüssel gehört nie in Git oder in die App.

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { leseExport } from '../import/lesen.mjs'
import { altLeads, altProjekte, ladeNeu } from './laden.mjs'
import { Befunde } from './vergleich.mjs'
import { pruefeVerkauf } from './pruefe-verkauf.mjs'
import { pruefeStamm, pruefeUeberzaehlig } from './pruefe-stamm.mjs'
import { pruefeKennzahlen } from './pruefe-kennzahlen.mjs'
import { pruefeLiquiditaet } from './pruefe-liquiditaet.mjs'
import { pruefeAltdaten } from './plausibel.mjs'
import { alsMarkdown } from './bericht.mjs'

const argumente = process.argv.slice(2)
const wert = (/** @type {string} */ n) => (argumente.includes(n) ? argumente[argumente.indexOf(n) + 1] : undefined)
const pfad = argumente.find((a, i) => !a.startsWith('--') && !argumente[i - 1]?.startsWith('--'))
const berichtDatei = wert('--bericht') ?? 'abgleich-bericht.md'
const heute = wert('--heute') ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!pfad || !schluessel) {
  console.error('Aufruf: SUPABASE_SERVICE_ROLE_KEY=… npm run import:abgleich -- "CRM-Umzug.zip"')
  process.exit(1)
}

const db = createClient(url, schluessel, { auth: { persistSession: false } })
const { daten } = leseExport(pfad)
const alt = { leads: altLeads(daten), projects: altProjekte(daten) }
console.log(`Export vom ${daten.at}, Ziel ${url}, Stichtag ${heute}`)
const neu = await ladeNeu(db)

const b = new Befunde()
pruefeVerkauf(b, alt, neu)
pruefeStamm(b, daten, neu)
pruefeUeberzaehlig(b, daten, alt, neu)
const kennzahlen = await pruefeKennzahlen(b, db, alt, neu, heute)
const liquiditaet = await pruefeLiquiditaet(b, daten, neu, heute)
const altdaten = pruefeAltdaten(daten, alt)

writeFileSync(berichtDatei, alsMarkdown({ daten, url, heute, befunde: b, kennzahlen, liquiditaet, altdaten }))
writeFileSync(
  berichtDatei.replace(/\.md$/, '') + '.json',
  JSON.stringify({ befunde: b.liste, kennzahlen, liquiditaet, altdaten }, null, 1),
)

const fehler = b.liste.filter((x) => x.art === 'fehler')
/** @type {Map<string, number>} */
const jeFeld = new Map()
for (const f of fehler) jeFeld.set(`${f.bereich} › ${f.feld}`, (jeFeld.get(`${f.bereich} › ${f.feld}`) ?? 0) + 1)
for (const [k, n] of [...jeFeld].sort((x, y) => y[1] - x[1])) console.log(`✗ ${String(n).padStart(4)}  ${k}`)
const geprueft = [...b.geprueft.values()].reduce((s, n) => s + n, 0)
console.log(
  `${fehler.length === 0 ? '✓' : '✗'} ${geprueft} Werte geprüft, ${fehler.length} Abweichungen, ${altdaten.length} Auffälligkeiten in den alten Daten · ${berichtDatei}`,
)
process.exit(fehler.length === 0 ? 0 : 2)
