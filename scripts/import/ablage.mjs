// Gewonnen oder nicht entscheidet die Ablage in SharePoint, nicht der Stand im alten CRM
// (Chris 31.10.2026, Frage 14: «nur Adjudications ist gewonnen»; Frage 16B).
// Die Ordnerliste liest man vorher aus SharePoint aus (nur lesen) und gibt sie mit --ablage mit.
// Sie enthält Kundennamen und liegt darum nie im Repo (öffentlich), sondern in den Projektdateien.

import { readFileSync } from 'node:fs'

/**
 * @typedef {{ gruppe: string, jahr?: string, name: string, nummer: string | null, hyd_nummer?: string, datei?: boolean, nummer_richtig?: string, grund?: string }} Ordner
 * @typedef {{ gewonnen: Set<string>, verloren: Set<string> }} Ablage
 * @typedef {{ nr: string, vorher: string, nachher: string, grund: string }} Korrektur
 */

/** V233-Stände, die als gewonnen zählen. */
const GEWONNEN = ['closed', 'construction', 'done']

/**
 * Vergleichbare Nummer: «100019 (12646)» → «100019», «HYD-129» → «hyd-129», «09103» → «9103».
 * @param {unknown} nr
 * @returns {string | null}
 */
export function ablageNummer(nr) {
  const t = String(nr ?? '').trim()
  const ziffern = /^(hyd)?\D*(\d+)/i.exec(t)
  if (!ziffern) return null
  return ziffern[1] ? `hyd-${Number(ziffern[2])}` : String(Number(ziffern[2]))
}

/**
 * Liest die Ordnerliste (JSON-Liste mit gruppe «…-adjudications» bzw. «…-perdus»).
 * @param {string} pfad
 * @returns {Ablage}
 */
export function leseAblage(pfad) {
  const ordner = /** @type {Ordner[]} */ (JSON.parse(readFileSync(pfad, 'utf8')))
  /** @type {Ablage} */
  const ablage = { gewonnen: new Set(), verloren: new Set() }
  for (const o of ordner) {
    // nummer_richtig: von Hand geklärt, die Nummer im Ordnernamen ist falsch (Grund in «grund»).
    const nr = ablageNummer(o.nummer_richtig ?? o.hyd_nummer ?? o.nummer)
    if (!nr) continue
    if (o.gruppe.endsWith('adjudications')) ablage.gewonnen.add(nr)
    else if (o.gruppe.endsWith('perdus')) ablage.verloren.add(nr)
  }
  return ablage
}

/**
 * Richtiger Stand einer Offerte nach der Ablage:
 * - Ordner in Adjudications (und nicht auch in Perdus) → gewonnen («closed»), wenn noch nicht gewonnen.
 * - Gewonnen ohne Ordner → zurück auf «offeriert» (16B). Im Bau oder abgeschlossen bleibt gewonnen.
 * - Nummer in beiden Ablagen: unklar, der Stand im alten CRM bleibt.
 * @param {{ nr?: unknown, statusKey?: string }} projekt
 * @param {Ablage} ablage
 * @returns {{ status: string, grund: string } | null} null = keine Änderung
 */
export function standNachAblage(projekt, ablage) {
  const nr = ablageNummer(projekt.nr)
  if (!nr) return null
  const status = projekt.statusKey ?? ''
  const gewonnen = ablage.gewonnen.has(nr)
  const verloren = ablage.verloren.has(nr)
  if (gewonnen && verloren) return null
  if (gewonnen && !GEWONNEN.includes(status)) return { status: 'closed', grund: 'Ordner in Adjudications' }
  if (!gewonnen && status === 'closed')
    return { status: 'sent', grund: 'gewonnen im alten CRM, aber kein Ordner in Adjudications' }
  return null
}

/**
 * Korrigiert den Stand aller Offerten der Vorlage an Ort und Stelle. Der alte Stand bleibt in
 * `_statusVorlage`, damit er in alt_daten nachvollziehbar ist.
 * @param {Record<string, Record<string, any>>} projekte Sammlung «projects» der Vorlage
 * @param {Ablage} ablage
 * @returns {Korrektur[]}
 */
export function korrigiereNachAblage(projekte, ablage) {
  /** @type {Korrektur[]} */
  const korrekturen = []
  for (const [id, p] of Object.entries(projekte)) {
    const neu = standNachAblage(p, ablage)
    if (!neu) continue
    korrekturen.push({ nr: String(p.nr ?? id), vorher: p.statusKey ?? '', nachher: neu.status, grund: neu.grund })
    p._statusVorlage = p.statusKey ?? ''
    p.statusKey = neu.status
  }
  return korrekturen
}
