// Feld-für-Feld-Abgleich von Mitarbeitenden, Preisliste, Finanzen, Spesen und Zeitachse.

import { numVal, rappenWieV233 } from '../import/v233.mjs'
import { nullWieNull } from './vergleich.mjs'

/** @param {unknown} v */
const t = (v) => (v === null || v === undefined ? '' : String(v).trim())
/** Betrag wie V233 (finNum), leer = null. @param {unknown} v */
const chf = (v) => nullWieNull(rappenWieV233(v))
/** V233 finMatTotal einer Material-Position in Rappen. @param {Record<string, any>} m @param {number} mwst */
const material = (m, mwst) =>
  Math.round(Math.round((numVal(m.ek) + numVal(m.transport)) * 100) * (m.exkl ? 1 + mwst / 100 : 1))

/**
 * Verkaufspreis wie die Sicht preisliste: EK des günstigsten Lieferanten × (1 + Marge) × (1 + Skonto),
 * ohne EK der fest eingetragene Verkaufspreis.
 * @param {Record<string, any>} a Artikel
 * @param {import('./laden.mjs').Neu} neu
 */
function vkWieSicht(a, neu) {
  const eks = neu.tabellen.lieferantenpreise
    .filter((l) => l.artikel_id === a.id && !l.geloescht_am && l.ek_rappen !== null)
    .map((l) => Number(l.ek_rappen))
  if (eks.length === 0) return a.verkauf_rappen ?? null
  return Math.round(Math.min(...eks) * (1 + Number(a.marge ?? 0)) * (1 + Number(a.skonto ?? 0)))
}

/**
 * @param {import('./vergleich.mjs').Befunde} b
 * @param {import('../import/lesen.mjs').VorlageDaten} daten
 * @param {import('./laden.mjs').Neu} neu
 */
export function pruefeStamm(b, daten, neu) {
  const c = (/** @type {string} */ n) => Object.entries(daten.cols[n] ?? {})

  for (const [id, u] of c('users')) {
    const p = neu.nachAltId.personen.get(`user:${id}`)
    if (!b.vergleiche('Mitarbeitende', id, 'vorhanden', true, !!p) || !p) continue
    b.vergleiche('Mitarbeitende', id, 'Name', u.name, p.name)
    b.vergleiche('Mitarbeitende', id, 'E-Mail', t(u.email).toLowerCase(), p.email)
    b.vergleiche('Mitarbeitende', id, 'aktiv', u.active !== false, p.aktiv)
    b.vergleiche('Mitarbeitende', id, 'Recht Finanzen', u.finanzen === true, (p.rechte ?? []).includes('finanzen'))
    b.vergleiche('Mitarbeitende', id, 'Recht Preise', u.preis === true, (p.rechte ?? []).includes('preise'))
  }

  for (const [id, a] of c('preisartikel')) {
    const n = neu.nachAltId.artikel.get(`preisartikel:${id}`)
    const nr = t(a.artnr) || id
    if (!b.vergleiche('Preisliste', nr, 'vorhanden', true, !!n) || !n) continue
    b.vergleiche('Preisliste', nr, 'Name', a.name, n.name)
    b.vergleiche('Preisliste', nr, 'Artikelnummer', a.artnr, n.artikelnummer)
    b.vergleiche('Preisliste', nr, 'Verkauf brutto (Rappen)', chf(a.brutto), nullWieNull(n.verkauf_rappen))
    b.vergleiche('Preisliste', nr, 'Marge', a.marge, n.marge)
    b.vergleiche('Preisliste', nr, 'Rabatt', a.rabatt, n.rabatt)
    b.vergleiche('Preisliste', nr, 'Skonto', a.skonto, n.skonto)
    b.vergleiche('Preisliste', nr, 'Einheit', t(a.einheit) || 'Stk', n.einheit)
    b.vergleiche('Preisliste', nr, 'Leistung W', a.wp, n.leistung_w)
    b.vergleiche('Preisliste', nr, 'Gewicht kg', a.gewicht, n.gewicht_kg)
    b.vergleiche('Preisliste', nr, 'archiviert', a.archiviert === true, !!n.archiviert_am)
    // Verkaufspreis wie V233 pcArtPos/pcLine: EK × (1 + Marge) × (1 + Skonto), Vorgaben 25 % und 1.5 %.
    // Wie die Sicht preisliste rechnet (günstigster Lieferant, vk_aus_ek); die Sicht selbst zeigt dem
    // Dienstschlüssel nichts, weil sie das Recht der angemeldeten Person prüft.
    const vk = vkWieSicht(n, neu)
    if (numVal(a.ek)) {
      const marge = a.marge == null ? 0.25 : Number(a.marge)
      const skonto = a.skonto == null ? 0.015 : Number(a.skonto)
      const altVk = Math.round(numVal(a.ek) * 100 * (1 + marge) * (1 + skonto))
      const diff = Math.abs(altVk - Number(vk))
      if (diff > 0)
        b.melde({
          bereich: 'Preisliste',
          datensatz: nr,
          feld: 'Verkaufspreis (Rappen)',
          alt: altVk,
          neu: vk,
          art: diff <= 1 ? 'hinweis' : 'fehler',
          grund: diff <= 1 ? 'Rundung: V233 rechnete mit EK auf Zehntel-Rappen' : undefined,
        })
      else b.vergleiche('Preisliste', nr, 'Verkaufspreis (Rappen)', altVk, vk)
    }
    const lief = Array.isArray(a.lief) && a.lief.length ? a.lief : numVal(a.ek) ? [{ n: a.liefBest, ek: a.ek }] : []
    for (const l of lief) {
      const z = neu.nachAltId.lieferantenpreise.get(`preisartikel:${id}:lief:${t(l.n) || 'ohne'}`)
      b.vergleiche(
        'Preisliste',
        nr,
        `Einkauf ${t(l.n) || 'ohne Lieferant'} (Rappen)`,
        chf(l.ek),
        nullWieNull(z?.ek_rappen),
      )
    }
  }

  for (const [id, z] of c('finpay')) {
    const n = neu.nachAltId.kreditor_zahlungen.get(`finpay:${id}`)
    const nr = `${t(z.firma)} ${t(z.text)}`.trim() || id
    if (!b.vergleiche('Zahlungen (Kreditoren)', nr, 'vorhanden', true, !!n) || !n) continue
    b.vergleiche('Zahlungen (Kreditoren)', nr, 'Betrag (Rappen)', chf(z.betrag), nullWieNull(n.betrag_rappen))
    b.vergleiche('Zahlungen (Kreditoren)', nr, 'fällig', z.faellig, n.faellig_am)
    b.vergleiche('Zahlungen (Kreditoren)', nr, 'geplant', z.geplantAm, n.geplant_am)
    b.vergleiche('Zahlungen (Kreditoren)', nr, 'Status', t(z.status) || 'offen', n.status)
    b.vergleiche('Zahlungen (Kreditoren)', nr, 'bezahlt am', z.bezahltAm, n.bezahlt_am)
    b.vergleiche('Zahlungen (Kreditoren)', nr, 'Priorität', z.prio, n.prioritaet)
  }
  for (const [id, f] of c('finfix')) {
    const n = neu.nachAltId.fixkosten.get(`finfix:${id}`)
    const nr = t(f.bezeichnung) || id
    if (!b.vergleiche('Fixkosten', nr, 'vorhanden', true, !!n) || !n) continue
    b.vergleiche('Fixkosten', nr, 'Betrag (Rappen)', chf(f.betrag), nullWieNull(n.betrag_rappen))
    b.vergleiche('Fixkosten', nr, 'Rhythmus', t(f.rhythmus) || 'monat', n.rhythmus)
    b.vergleiche('Fixkosten', nr, 'Tag', f.tag, n.tag)
    b.vergleiche('Fixkosten', nr, 'ab', f.ab, n.ab)
    b.vergleiche('Fixkosten', nr, 'bis', f.bis, n.bis)
    b.vergleiche('Fixkosten', nr, 'aktiv', f.aktiv !== false, n.aktiv)
  }
  for (const [id, e] of c('finin')) {
    const n = neu.nachAltId.erwartete_eingaenge.get(`finin:${id}`)
    const nr = `${t(e.kunde)} ${t(e.text)}`.trim() || id
    if (!b.vergleiche('Erwartete Eingänge', nr, 'vorhanden', true, !!n) || !n) continue
    b.vergleiche('Erwartete Eingänge', nr, 'Betrag (Rappen)', chf(e.betrag), nullWieNull(n.betrag_rappen))
    b.vergleiche('Erwartete Eingänge', nr, 'erwartet am', e.erwartetAm, n.erwartet_am)
    b.vergleiche('Erwartete Eingänge', nr, 'Wahrscheinlichkeit', e.prob, n.wahrscheinlichkeit)
    b.vergleiche('Erwartete Eingänge', nr, 'Status', t(e.status) || 'offen', n.status)
  }
  const mwst = Number(daten.cols.finset?.main?.mwst) || 8.1
  for (const [id, m] of c('finmat')) {
    const n = neu.nachAltId.material_zahlungen.get(`finmat:${id}`)
    const nr = t(m.baustelle) || id
    if (!b.vergleiche('Material', nr, 'vorhanden', true, !!n) || !n) continue
    const pos = Array.isArray(m.pos) ? m.pos : []
    const neuPos = Array.isArray(n.positionen) ? n.positionen : []
    b.vergleiche('Material', nr, 'Positionen', pos.length, neuPos.length)
    b.vergleiche(
      'Material',
      nr,
      'Summe (Rappen)',
      pos.reduce((s, x) => s + material(x, mwst), 0),
      neuPos.reduce((s, x) => s + material(x, mwst), 0),
    )
  }
  const saldo = daten.cols.finset?.main?.saldo
  const neuSaldo = neu.tabellen.finanz_einstellungen.find((f) => f.schluessel === 'vorlage.main')?.wert?.saldo
  if (saldo) {
    b.vergleiche(
      'Kontostand',
      'Liquidität',
      'Betrag (Rappen)',
      chf(saldo.betrag),
      neuSaldo?.betrag_rappen ?? chf(neuSaldo?.betrag),
    )
    b.vergleiche('Kontostand', 'Liquidität', 'Datum', saldo.datum, neuSaldo?.datum)
  }

  for (const [id, s] of c('expenses')) {
    const n = neu.nachAltId.spesen.get(`expense:${id}`)
    if (!b.vergleiche('Spesen', id, 'vorhanden', true, !!n) || !n) continue
    b.vergleiche('Spesen', id, 'Betrag (Rappen)', chf(s.betrag), nullWieNull(n.betrag_rappen))
    b.vergleiche('Spesen', id, 'Datum', s.datum, n.datum)
    b.vergleiche('Spesen', id, 'Status', s.status, n.status)
    b.vergleiche('Spesen', id, 'Kategorie', s.kategorie, n.kategorie)
    b.vergleiche('Spesen', id, 'Person', s.uid, neu.nachId.personen.get(n.person_id)?.kuerzel)
  }

  for (const [id, a] of c('activities')) {
    const n = neu.nachAltId.aktivitaeten.get(`activity:${id}`)
    if (!b.vergleiche('Zeitachse', id, 'vorhanden', true, !!n) || !n) continue
    b.vergleiche(
      'Zeitachse',
      id,
      'Zeitpunkt',
      new Date(a.at ?? a.createdAt).toISOString(),
      new Date(n.zeitpunkt).toISOString(),
    )
    b.vergleiche(
      'Zeitachse',
      id,
      'Lead',
      t(a.leadId) || null,
      neu.nachId.verkaufschancen.get(n.verkaufschance_id)?.nummer ?? null,
    )
    b.vergleiche('Zeitachse', id, 'Text', a.text, n.text)
  }

  const blobs = (daten.blobs ?? []).length
  const mitDatei = neu.tabellen.dokumente.filter((d) => d.alt_id && d.speicher_pfad).length
  b.vergleiche('Dokumente', 'Dateien', 'Anzahl mit Datei', blobs, mitDatei)
}

/**
 * Zeilen, die der Import früher angelegt hat, deren Datensatz im neuen Export aber fehlt (im alten CRM
 * inzwischen endgültig gelöscht). Sie würden sonst still weiter zählen.
 * @param {import('./vergleich.mjs').Befunde} b
 * @param {import('../import/lesen.mjs').VorlageDaten} daten
 * @param {{ leads: Record<string, any>[], projects: Record<string, any>[] }} alt
 * @param {import('./laden.mjs').Neu} neu
 */
export function pruefeUeberzaehlig(b, daten, alt, neu) {
  const ids = (/** @type {string} */ s, /** @type {string} */ vor) =>
    Object.keys(daten.cols[s] ?? {}).map((id) => `${vor}:${id}`)
  /** @type {[string, string, string[]][]} */
  const erwartet = [
    ['Leads', 'verkaufschancen', alt.leads.map((l) => `lead:${l.id}`)],
    ['Offerten', 'offerten', alt.projects.map((p) => `project:${p.id}`)],
    ['Projekte', 'projekte', alt.projects.map((p) => `project:${p.id}`)],
    ['Preisliste', 'artikel', ids('preisartikel', 'preisartikel')],
    ['Zahlungen (Kreditoren)', 'kreditor_zahlungen', ids('finpay', 'finpay')],
    ['Fixkosten', 'fixkosten', ids('finfix', 'finfix')],
    ['Erwartete Eingänge', 'erwartete_eingaenge', ids('finin', 'finin')],
    ['Material', 'material_zahlungen', ids('finmat', 'finmat')],
    ['Spesen', 'spesen', ids('expenses', 'expense')],
    ['Zeitachse', 'aktivitaeten', ids('activities', 'activity')],
    ['Mitarbeitende', 'personen', ids('users', 'user')],
  ]
  for (const [bereich, tabelle, liste] of erwartet) {
    const soll = new Set(liste)
    for (const z of neu.tabellen[tabelle] ?? []) {
      const a = String(z.alt_id ?? '')
      if (!a || a.startsWith('seed:') || z.geloescht_am || soll.has(a)) continue
      if (!/^(lead|project|preisartikel|finpay|finfix|finin|finmat|expense|activity|user):[^:]+$/.test(a)) continue
      b.melde({
        bereich,
        datensatz: a,
        feld: 'nur im neuen CRM',
        alt: null,
        neu: a,
        art: 'fehler',
        grund: 'im neuen Export nicht mehr vorhanden (im alten CRM gelöscht?)',
      })
    }
  }
}
