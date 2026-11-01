// Liquiditätsvorschau alt gegen neu: V233 finFlows/finForecast (hier nachgebaut) gegen die echte Rechnung
// der App (src/modules/finance/lib/vorschau.ts, zur Laufzeit mit TypeScript übersetzt) auf den importierten Daten.

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { numVal } from '../import/v233.mjs'

/** Übersetzt vorschau.ts und datum.ts in einen leeren Ordner und lädt sie. */
async function ladeAppRechnung() {
  const ziel = mkdtempSync(join(tmpdir(), 'abgleich-'))
  for (const name of ['vorschau', 'datum']) {
    const quelle = readFileSync(new URL(`../../src/modules/finance/lib/${name}.ts`, import.meta.url), 'utf8')
    const js = ts.transpileModule(quelle, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    writeFileSync(join(ziel, `${name}.mjs`), js.outputText.replace(/from '\.\/datum'/g, "from './datum.mjs'"))
  }
  return import(pathToFileURL(join(ziel, 'vorschau.mjs')).href)
}

/** @param {string} iso @param {number} n */
const plus = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** @param {string} iso */
const montag = (iso) => plus(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7))
const rp = (/** @type {unknown} */ v) => Math.round(numVal(v) * 100)

/**
 * V233 finFixDates.
 * @param {Record<string, any>} f @param {string} von @param {string} bis
 */
function fixDaten(f, von, bis) {
  const schritt = f.rhythmus === 'quartal' ? 3 : f.rhythmus === 'jahr' ? 12 : 1
  const tag = Math.min(28, Math.max(1, +f.tag || 25))
  const start = f.ab || '2000-01-01'
  const ende = f.bis || '9999-12-31'
  const anker = f.startMonat ? +f.startMonat - 1 : 0
  const [j, m] = von.split('-').map(Number)
  const out = []
  for (let i = 0; i < 40; i++) {
    const d = new Date(Date.UTC(j, m - 1 + i, tag, 12))
    const iso = d.toISOString().slice(0, 10)
    if (iso > bis) break
    if (schritt > 1 && (d.getUTCMonth() - anker + 12) % schritt !== 0) continue
    if (iso < von || iso < start || iso > ende) continue
    out.push(iso)
  }
  return out
}

/**
 * V233 finForecast ohne AbaNinja und ohne Zahlungspläne (beide im Export leer bzw. live).
 * @param {import('../import/lesen.mjs').VorlageDaten} daten @param {string} heute @param {'real'|'pess'|'opt'} szen
 */
export function v233Vorschau(daten, heute, szen) {
  const set = daten.cols.finset?.main ?? {}
  const pay = Object.entries(daten.cols.finpay ?? {}).map(([id, x]) => ({ ...x, id }))
  const mat = Object.values(daten.cols.finmat ?? {})
  const fix = Object.entries(daten.cols.finfix ?? {}).map(([id, x]) => ({ ...x, id }))
  const inn = Object.values(daten.cols.finin ?? {})
  const mwst = Number(set.mwst) || 8.1
  const wochen = Math.max(4, Math.min(26, +(set.wochen || 12)))
  /** @type {{ dir: number, rappen: number, datum: string, prob: string }[]} */
  const flows = []
  const add = (/** @type {{ dir: number, rappen: number, datum: string, prob: string }} */ f) =>
    f.rappen && flows.push(f)
  for (const p of pay)
    if (p.status !== 'bezahlt' && rp(p.betrag))
      add({ dir: -1, rappen: rp(p.betrag), datum: p.geplantAm || p.faellig || '', prob: 'sicher' })
  for (const m of mat) {
    if (m.archiv) continue
    for (const x of m.pos || []) {
      if (x.status === 'bezahlt') continue
      const r = Math.round((rp(x.ek) + rp(x.transport)) * (x.exkl ? 1 + mwst / 100 : 1))
      const datum =
        x.geplantAm ||
        m.geplantAm ||
        m.zahlbarBis ||
        (m.bautermin ? plus(m.bautermin, -(Number(set.vorlauf) || 5)) : '')
      add({ dir: -1, rappen: r, datum, prob: 'sicher' })
    }
  }
  const horizont = plus(heute, 7 * wochen + 7)
  for (const f of fix) {
    if (f.aktiv === false || !rp(f.betrag)) continue
    for (const d of fixDaten(f, plus(heute, -40), horizont)) {
      if (pay.some((p) => p.fixId === f.id && p.monat === d.slice(0, 7))) continue
      add({ dir: -1, rappen: rp(f.betrag), datum: d, prob: 'sicher' })
    }
  }
  for (const i of inn)
    if (i.status !== 'eingegangen' && rp(i.betrag))
      add({ dir: 1, rappen: rp(i.betrag), datum: i.erwartetAm || '', prob: i.prob || 'wahrscheinlich' })
  const zaehlt = (/** @type {{ dir: number, prob: string }} */ f) =>
    f.prob !== 'aus' &&
    (f.dir < 0 || (szen === 'pess' ? f.prob === 'sicher' : szen === 'opt' ? true : f.prob !== 'unsicher'))
  const w0 = montag(heute)
  const liste = Array.from({ length: wochen }, (_, i) => ({ von: plus(w0, 7 * i), ein: 0, aus: 0, ende: 0 }))
  for (const f of flows.filter(zaehlt)) {
    const i = !f.datum || f.datum < w0 ? 0 : Math.floor((Date.parse(f.datum) - Date.parse(w0)) / (7 * 86400000))
    const w = liste[i]
    if (!w) continue
    if (f.dir > 0) w.ein += f.rappen
    else w.aus += f.rappen
  }
  // Kontostand: eingetragener Saldo (ohne Bankbuchungen); seither Bezahltes gibt es im Export nicht.
  let stand = set.saldo ? rp(set.saldo.betrag) : 0
  for (const w of liste) {
    stand += w.ein - w.aus
    w.ende = stand
  }
  return liste
}

/**
 * @param {import('./vergleich.mjs').Befunde} b
 * @param {import('../import/lesen.mjs').VorlageDaten} daten
 * @param {import('./laden.mjs').Neu} neu
 * @param {string} heute
 */
export async function pruefeLiquiditaet(b, daten, neu, heute) {
  const app = await ladeAppRechnung()
  // Nur Importiertes: was nach dem Import von Hand dazukam (oder lokale Testdaten), kennt V233 nicht.
  const ohne = (/** @type {Record<string, any>[]} */ z) =>
    z.filter((x) => !x.geloescht_am && x.alt_id && !String(x.alt_id).startsWith('seed:'))
  const d = {
    zahlungen: ohne(neu.tabellen.kreditor_zahlungen),
    material: ohne(neu.tabellen.material_zahlungen),
    fixkosten: ohne(neu.tabellen.fixkosten),
    eingaenge: ohne(neu.tabellen.erwartete_eingaenge),
    rechnungen: [],
    tranchen: [],
    kundenzahlungen: [],
    einstellungen: neu.tabellen.finanz_einstellungen.find((f) => f.schluessel === 'vorlage.main')?.wert ?? {},
  }
  /** @type {Record<string, any>[]} */
  const tabelle = []
  for (const szen of /** @type {const} */ (['real', 'pess', 'opt'])) {
    const alt = v233Vorschau(daten, heute, szen)
    const neuW = app.vorschau(d, heute, szen).wochen
    alt.forEach((w, i) => {
      const n = neuW[i]
      tabelle.push({
        szenario: szen,
        woche: w.von,
        alt_ein: w.ein,
        neu_ein: n?.ein,
        alt_aus: w.aus,
        neu_aus: n?.aus,
        alt_ende: w.ende,
        neu_ende: n?.ende,
      })
      b.vergleiche('Liquidität', `${szen} · Woche ab ${w.von}`, 'Eingänge', w.ein, n?.ein)
      b.vergleiche('Liquidität', `${szen} · Woche ab ${w.von}`, 'Ausgänge', w.aus, n?.aus)
      b.vergleiche('Liquidität', `${szen} · Woche ab ${w.von}`, 'Stand Ende Woche', w.ende, n?.ende)
    })
  }
  return tabelle
}
