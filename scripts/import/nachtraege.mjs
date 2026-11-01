// Aufträge, die nur in der SharePoint-Ablage stehen, und Angaben aus den Verträgen dort
// (Chris 1.11.2026, Frage 17: «durchsuch SharePoint in Adjudications nach Offerte oder Vertrag und somit Betrag»).
// Die Angaben liest man vorher aus den Dokumenten (nur lesen) in die Korrekturen-Datei (Projektdateien, nie Repo).
// Sie werden als Offerten der Vorlage eingefügt, damit Kunde, Objekt, Offerte, Projekt und Werkvertrag genau
// gleich entstehen wie für alle anderen und der Abgleich sie mit denselben Regeln prüft.

import { zuDatum } from './umwandeln.mjs'

/**
 * @typedef {{
 *   ordner: string, jahr: number | string, standort?: string, nummer?: string | null,
 *   vorname?: string | null, name?: string | null, firma?: string | null, strasse?: string | null,
 *   plz?: string | null, ort?: string | null, telefon?: string | null, email?: string | null,
 *   angebot_am?: string | null, unterschrieben_am?: string | null,
 *   betrag_exkl_chf?: number | null, betrag_inkl_chf?: number | null, sprache?: string | null, art?: string | null,
 * }} Nachtrag
 * @typedef {{ nummer: string, unterschrieben_am?: string | null, betrag_exkl_chf?: number | null, betrag_inkl_chf?: number | null }} Vertrag
 */

/** Für den Namen-Vergleich: klein, ohne Akzente. @param {unknown} s */
const glatt = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/**
 * Fügt Aufträge aus der Ablage als Offerten der Vorlage ein (id «ablage:<Nummer oder Ordner>»).
 * Ist der Kunde schon bekannt (gleicher Name und Ort oder gleiche Firma), bekommt der Auftrag seine Kundennummer,
 * sonst eine neue nach der letzten der Vorlage (die Vorlage zählt dann weiter).
 * @param {import('./lesen.mjs').VorlageDaten} daten wird verändert
 * @param {Nachtrag[]} nachtraege
 * @returns {string[]} Hinweise für den Bericht
 */
export function fuegeNachtraegeEin(daten, nachtraege) {
  const projekte = (daten.cols.projects ??= {})
  const leads = Object.values(daten.cols.leads ?? {})
  /** @type {Map<string, number>} */
  const bekannt = new Map()
  for (const d of [...Object.values(projekte), ...leads]) {
    const nr = Number(d.kundenNr)
    if (!nr) continue
    const name = glatt(d.nameMO ?? d.nachname)
    if (name && d.ort) bekannt.set(`${name}|${glatt(d.ort)}`, nr)
    if (d.firma) bekannt.set(`firma|${glatt(d.firma)}`, nr)
  }
  const meta = (daten.cols.meta ??= {})
  const zaehler = (meta.counters ??= {})
  /** @type {string[]} */
  const hinweise = []
  // Gleiche Reihenfolge bei jedem Lauf, damit neue Kundennummern gleich bleiben.
  for (const n of [...nachtraege].sort((a, b) => a.ordner.localeCompare(b.ordner))) {
    const id = `ablage:${n.nummer ?? n.ordner}`
    const schonDa = Object.values(projekte).some(
      (p) => n.nummer && String(p.nr).toLowerCase() === n.nummer.toLowerCase(),
    )
    if (schonDa) {
      hinweise.push(`Ablage ${n.ordner}: Offerte ${n.nummer} ist schon in der Vorlage, nicht doppelt angelegt`)
      continue
    }
    let kundenNr =
      bekannt.get(`${glatt(n.name)}|${glatt(n.ort)}`) ?? (n.firma ? bekannt.get(`firma|${glatt(n.firma)}`) : undefined)
    if (!kundenNr) {
      kundenNr = Number(zaehler.kundenSeq ?? 0) + 1
      zaehler.kundenSeq = kundenNr
    }
    projekte[id] = {
      nr: n.nummer && /^\d+$/.test(n.nummer) ? Number(n.nummer) : (n.nummer ?? id),
      kundenNr,
      nameMO: n.name ?? null,
      vornameMO: n.vorname ?? null,
      firma: n.firma ?? null,
      projektname: n.ordner,
      street: n.strasse ?? null,
      plz: n.plz ?? null,
      ort: n.ort ?? null,
      tel: n.telefon ?? null,
      mail: n.email ?? null,
      lang: n.sprache ?? (n.standort === 'muri' ? 'de' : 'fr'),
      standort: n.standort === 'muri' ? 'Muri' : 'Bulle',
      angebotAm: zuDatum(n.angebot_am) ?? null,
      unterzeichnetAm: zuDatum(n.unterschrieben_am) ?? null,
      angebotswert: n.betrag_exkl_chf ?? null,
      vertragswert: n.betrag_inkl_chf ?? null,
      statusKey: 'closed',
      createdAt: daten.at,
      updatedAt: daten.at,
      _ausAblage: { ordner: n.ordner, jahr: Number(n.jahr), art: n.art ?? null },
    }
    // Der Zählbericht vergleicht mit der Anzahl laut Export: die Nachträge zählen dazu.
    if (daten.counts?.projects !== undefined) daten.counts.projects += 1
    hinweise.push(`Ablage ${n.ordner}: als Auftrag angelegt (Kunde K${String(kundenNr).padStart(4, '0')})`)
  }
  return hinweise
}

/**
 * Ergänzt fehlende Unterschriftsdaten und Beträge bestehender Aufträge aus den Verträgen in der Ablage.
 * Vorhandene Werte der Vorlage bleiben; ergänzte Felder stehen in `_ausVertrag`.
 * @param {Record<string, Record<string, any>>} projekte Sammlung «projects» der Vorlage
 * @param {Vertrag[]} vertraege
 * @returns {string[]} Hinweise für den Bericht
 */
export function ergaenzeAusVertraegen(projekte, vertraege) {
  const nachNr = new Map(Object.values(projekte).map((p) => [String(p.nr).toLowerCase(), p]))
  /** @type {string[]} */
  const hinweise = []
  for (const v of vertraege) {
    const p = nachNr.get(String(v.nummer).toLowerCase())
    if (!p) continue
    /** @type {string[]} */
    const felder = []
    if (!p.unterzeichnetAm && zuDatum(v.unterschrieben_am)) {
      p.unterzeichnetAm = zuDatum(v.unterschrieben_am)
      felder.push('Unterschrift')
    }
    if (!Number(p.vertragswert) && v.betrag_inkl_chf) {
      p.vertragswert = v.betrag_inkl_chf
      felder.push('Vertragswert')
    }
    if (!Number(p.angebotswert) && v.betrag_exkl_chf) {
      p.angebotswert = v.betrag_exkl_chf
      felder.push('Angebotswert')
    }
    if (!felder.length) continue
    p._ausVertrag = felder
    hinweise.push(`Offerte ${p.nr}: ${felder.join(', ')} aus dem Vertrag in der Ablage`)
  }
  return hinweise
}
