#!/usr/bin/env node
// Importiert den Export «Für Web-App» der Vorlage V233 in die Datenbank und erstellt einen Zählbericht.
//
//   SUPABASE_SERVICE_ROLE_KEY=… npm run import:vorlage -- "CRM bisher.zip" [--bericht import-bericht.md]
//     [--ablage sharepoint-adjudications.json]   (gewonnen nur mit Ordner in Adjudications, siehe ablage.mjs)
//
// Wiederholbar: jede Zeile hat eine alt_id; ein zweiter Lauf aktualisiert statt zu verdoppeln.
// Standardmässig nur gegen die lokale Datenbank; der echte Umzug (Phase 16) braucht --umzug.

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { leseExport } from './lesen.mjs'
import { Schreiber } from './schreiber.mjs'
import { Zuordner } from './zuordner.mjs'
import { erstelleBericht, alsMarkdown } from './bericht.mjs'
import { text } from './umwandeln.mjs'
import { korrigiereNachAblage, leseAblage } from './ablage.mjs'
import { ladeStammdaten, importiereOrganisation } from './schritte/organisation.mjs'
import { importierePreise } from './schritte/preise.mjs'
import { importiereKunden } from './schritte/kunden.mjs'
import { importiereVerkauf, importiereAktivitaeten } from './schritte/verkauf.mjs'
import { importiereOfferten } from './schritte/offerten.mjs'
import { importiereDokumente } from './schritte/dokumente.mjs'
import { importiereFinanzen } from './schritte/finanzen.mjs'
import { importiereUebrige } from './schritte/uebrige.mjs'

/**
 * Alles, was die Schritte gemeinsam brauchen.
 * @typedef {{
 *   db: import('@supabase/supabase-js').SupabaseClient,
 *   daten: import('./lesen.mjs').VorlageDaten,
 *   datei: (id: string) => Uint8Array | null,
 *   schreiber: Schreiber,
 *   zuordner: Zuordner,
 *   ids: Record<string, Map<any, string>>,
 *   bericht: { dateienHochgeladen: number },
 *   sammlung: (name: string) => Record<string, Record<string, any>>,
 *   person: (name: unknown) => string | null,
 *   hinweis: (text: string) => void,
 *   verknuepfeDokumente: (tabelle: string, paare: (unknown)[][]) => Promise<void>,
 * }} Kontext
 */

const argumente = process.argv.slice(2)
const wert = (/** @type {string} */ n) => (argumente.includes(n) ? argumente[argumente.indexOf(n) + 1] : undefined)
const pfad = argumente.find((a, i) => !a.startsWith('--') && !argumente[i - 1]?.startsWith('--'))
const berichtDatei = wert('--bericht') ?? 'import-bericht.md'
const ablageDatei = wert('--ablage')
const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!pfad) {
  console.error('Bitte den Export angeben: npm run import:vorlage -- "CRM bisher.zip"')
  process.exit(1)
}
if (!schluessel) {
  console.error('SUPABASE_SERVICE_ROLE_KEY fehlt (lokal: «npx supabase status» zeigt ihn). Nie in Git oder in die App!')
  process.exit(1)
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url) && !argumente.includes('--umzug')) {
  console.error(`Ziel ${url} ist nicht lokal. Für den echten Umzug --umzug angeben (erst in Phase 16).`)
  process.exit(1)
}

const start = Date.now()
const db = createClient(url, schluessel, { auth: { persistSession: false } })
const { daten, datei } = leseExport(pfad)
console.log(
  `Export vom ${daten.at} (${daten.by}): ${Object.keys(daten.cols).length} Sammlungen, ${daten.blobs.length} Dateien`,
)

/** @type {string[]} */
const hinweise = []
if (ablageDatei) {
  const korrekturen = korrigiereNachAblage(daten.cols.projects ?? {}, leseAblage(ablageDatei))
  for (const x of korrekturen)
    hinweise.push(`Offerte ${x.nr}: Stand ${x.vorher || '(leer)'} → ${x.nachher} (${x.grund})`)
  console.log(`Ablage SharePoint: ${korrekturen.length} Offerten mit korrigiertem Stand`)
} else console.warn('Ohne --ablage: Stand «gewonnen» wird nicht gegen SharePoint Adjudications geprüft.')

const { data: auswahl, error: auswahlFehler } = await db.from('auswahlwerte').select('liste, schluessel, eigenschaften')
if (auswahlFehler) throw new Error(`auswahlwerte: ${auswahlFehler.message}`)

const namen = [
  'personen',
  'standorte',
  'firmen',
  'regionen',
  'lieferanten',
  'ablauf',
  'pvSchritte',
  'artikel',
  'kontakte',
  'objekte',
  'verkaufschancen',
  'offerten',
  'offertNr',
  'projekte',
  'werkvertraege',
  'vertragsDokument',
  'dokumente',
]
/** @type {Kontext} */
const k = {
  db,
  daten,
  datei,
  schreiber: new Schreiber(db),
  zuordner: new Zuordner(/** @type {any} */ (auswahl)),
  ids: Object.fromEntries(namen.map((n) => [n, new Map()])),
  bericht: { dateienHochgeladen: 0 },
  sammlung: (name) => daten.cols[name] ?? {},
  person: (name) => {
    const n = text(name)?.toLowerCase()
    return n ? (k.ids.personen.get(n) ?? null) : null
  },
  hinweis: (t) => hinweise.push(t),
  // Setzt bezug_id an Dokumenten, die zu erst später angelegten Datensätzen gehören (Spesen, Handbuch …).
  verknuepfeDokumente: async (tabelle, paare) => {
    for (const [dokument, ziel] of paare) {
      if (!dokument || !ziel) continue
      const { error } = await db.from('dokumente').update({ bezug_tabelle: tabelle, bezug_id: ziel }).eq('id', dokument)
      if (error) throw new Error(`dokumente bezug: ${error.message}`)
    }
  },
}

const { data: lauf, error: laufFehler } = await db
  .from('import_laeufe')
  .insert({ quelle: String(pfad).split(/[\\/]/).at(-1), export_vom: daten.at, export_von: daten.by })
  .select('id')
  .single()
if (laufFehler) throw new Error(`import_laeufe: ${laufFehler.message}`)

const schritte = /** @type {[string, (k: Kontext) => Promise<void>][]} */ ([
  ['Stammdaten lesen', ladeStammdaten],
  ['Mitarbeitende und Einladungen', importiereOrganisation],
  ['Preisliste und Lieferanten', importierePreise],
  ['Kontakte und Objekte', importiereKunden],
  ['Anfragen & Leads', importiereVerkauf],
  ['Offerten, Projekte, Werkverträge', importiereOfferten],
  ['Zeitachse', importiereAktivitaeten],
  ['Dokumente und Dateien', importiereDokumente],
  ['Spesen und Finanzen', importiereFinanzen],
  ['Handbuch, Marketing, Einstellungen, Protokoll', importiereUebrige],
])
for (const [name, schritt] of schritte) {
  const t = Date.now()
  await schritt(k)
  console.log(`✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)} s)`)
}
await k.schreiber.speichereAbgleich()

const naechste = Number(daten.cols.meta?.counters?.kundenSeq ?? 0) + 1
const { error: seqFehler } = await db.rpc('setze_naechste_kundennummer', { p_naechste: naechste })
if (seqFehler) throw new Error(`Kundennummer: ${seqFehler.message}`)

const bericht = erstelleBericht(
  daten,
  k.schreiber.abgleich,
  k.zuordner.unbekannt,
  hinweise,
  k.bericht.dateienHochgeladen,
)
const dauer = Math.round((Date.now() - start) / 1000)
await db
  .from('import_laeufe')
  .update({ beendet_am: new Date().toISOString(), ok: bericht.ok, bericht })
  .eq('id', lauf.id)
writeFileSync(berichtDatei, alsMarkdown(bericht, { export_vom: daten.at, export_von: daten.by, dauer_s: dauer }))

for (const z of bericht.zeilen)
  console.log(
    `${z.ok ? '✓' : '✗'} ${z.sammlung.padEnd(16)} ${String(z.export).padStart(4)} → ${String(z.uebernommen).padStart(4)}`,
  )
console.log(`${bericht.ok ? '✓ Zählung stimmt' : '✗ Zählung stimmt NICHT'} · Bericht: ${berichtDatei} · ${dauer} s`)
if (!bericht.ok) process.exit(2)
