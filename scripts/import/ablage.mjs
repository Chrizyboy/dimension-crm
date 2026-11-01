// Gewonnen oder nicht entscheidet die Ablage in SharePoint, nicht der Stand im alten CRM
// (Chris 31.10.2026, Frage 14: «nur Adjudications ist gewonnen»; Frage 16B).
// Die Ordnerliste liest man vorher aus SharePoint aus (nur lesen) und gibt sie mit --ablage mit.
// Sie enthält Kundennamen und liegt darum nie im Repo (öffentlich), sondern in den Projektdateien.

import { readFileSync } from 'node:fs'

/**
 * @typedef {{ gruppe: string, jahr?: string, name: string, nummer: string | null, hyd_nummer?: string, datei?: boolean, unterordner?: string, nummer_richtig?: string, grund?: string }} Ordner
 * @typedef {{ gewonnen: Set<string>, verloren: Set<string>, ordner: Map<string, Ordner> }} Ablage
 * @typedef {{ nr: string, vorher: string, nachher: string, grund: string }} Korrektur
 */

/** V233-Stände, die als gewonnen zählen. */
const GEWONNEN = ['closed', 'construction', 'done']

/**
 * Bis zu diesem Ablage-Jahr gilt ein Auftrag als gebaut (Chris 1.11.2026: «2024 natürlich schon gebaut»,
 * Frage 20A: auch die Ordner «A 2025»).
 * Er bleibt im CRM, aber abgeschlossen statt bei den geplanten Projekten. Mit --gebaut-bis änderbar.
 */
export const GEBAUT_BIS = 2025

/** Unterordner, die im laufenden Jahr «fertig gebaut» heissen (Bulle «2. FINI», Muri «Fertig», Abschlussarbeiten). */
const FERTIG = /fini|fertig|abschluss|clôture|cloture/i

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
  const ablage = { gewonnen: new Set(), verloren: new Set(), ordner: new Map() }
  for (const o of ordner) {
    // nummer_richtig: von Hand geklärt, die Nummer im Ordnernamen ist falsch (Grund in «grund»).
    const nr = ablageNummer(o.nummer_richtig ?? o.hyd_nummer ?? o.nummer)
    if (!nr) continue
    if (o.gruppe.endsWith('adjudications')) {
      ablage.gewonnen.add(nr)
      ablage.ordner.set(nr, o)
    } else if (o.gruppe.endsWith('perdus')) ablage.verloren.add(nr)
  }
  return ablage
}

/**
 * Richtiger Stand einer Offerte nach der Ablage:
 * - Ordner in Adjudications (und nicht auch in Perdus) → gewonnen («closed»), wenn noch nicht gewonnen.
 * - Gewonnen ohne Ordner → zurück auf «offeriert» (16B). Im Bau oder abgeschlossen bleibt gewonnen.
 * - Nummer in beiden Ablagen: unklar, der Stand im alten CRM bleibt.
 * - Auftrag mit Ordner aus einem Jahr bis `gebautBis` oder in einem Unterordner «fertig» → abgeschlossen («done»).
 * @param {{ nr?: unknown, statusKey?: string }} projekt
 * @param {Ablage} ablage
 * @param {number} [gebautBis]
 * @returns {{ status: string, grund: string } | null} null = keine Änderung
 */
export function standNachAblage(projekt, ablage, gebautBis = GEBAUT_BIS) {
  // Aufträge aus der Ablage selbst (nachtraege.mjs) tragen ihren Ordner mit, auch ohne Nummer.
  const eigen = /** @type {{ _ausAblage?: { ordner: string, jahr: number } }} */ (projekt)._ausAblage
  const nr = ablageNummer(projekt.nr) ?? (eigen ? `ablage:${eigen.ordner}` : null)
  if (!nr) return null
  const vorher = projekt.statusKey ?? ''
  const gewonnen = ablage.gewonnen.has(nr) || !!eigen
  if (gewonnen && ablage.verloren.has(nr)) return null
  if (!gewonnen)
    return vorher === 'closed'
      ? { status: 'sent', grund: 'gewonnen im alten CRM, aber kein Ordner in Adjudications' }
      : null

  /** @type {string[]} */
  const gruende = []
  let status = vorher
  if (!GEWONNEN.includes(status)) {
    status = 'closed'
    gruende.push('Ordner in Adjudications')
  }
  const o =
    ablage.ordner.get(nr) ??
    (eigen ? { gruppe: 'ablage', nummer: null, jahr: String(eigen.jahr), name: eigen.ordner } : undefined)
  const jahr = Number(o?.jahr)
  if (status === 'closed' && jahr && jahr <= gebautBis) {
    status = 'done'
    gruende.push(`Ordner aus ${jahr}, gilt als gebaut`)
  } else if (status === 'closed' && FERTIG.test(o?.unterordner ?? '')) {
    status = 'done'
    gruende.push(`Ordner in «${o?.unterordner}»`)
  }
  return status === vorher ? null : { status, grund: gruende.join(', ') }
}

/**
 * Korrigiert den Stand aller Offerten der Vorlage an Ort und Stelle. Der alte Stand bleibt in
 * `_statusVorlage`, damit er in alt_daten nachvollziehbar ist.
 * @param {Record<string, Record<string, any>>} projekte Sammlung «projects» der Vorlage
 * @param {Ablage} ablage
 * @param {number} [gebautBis] siehe GEBAUT_BIS
 * @returns {Korrektur[]}
 */
export function korrigiereNachAblage(projekte, ablage, gebautBis = GEBAUT_BIS) {
  /** @type {Korrektur[]} */
  const korrekturen = []
  for (const [id, p] of Object.entries(projekte)) {
    const neu = standNachAblage(p, ablage, gebautBis)
    if (neu) {
      korrekturen.push({ nr: String(p.nr ?? id), vorher: p.statusKey ?? '', nachher: neu.status, grund: neu.grund })
      p._statusVorlage = p.statusKey ?? ''
      p.statusKey = neu.status
    }
    const datum = auftragsDatum(p, ablage)
    if (datum) {
      korrekturen.push({
        nr: String(p.nr ?? id),
        vorher: p.angebotAm ?? '',
        nachher: datum,
        grund: 'Entscheid-Datum aus dem Jahr des Ordners (ohne Unterschriftsdatum)',
      })
      p._entscheidGeschaetzt = true
      p.entscheidAm = datum
    }
  }
  return korrekturen
}

/**
 * Datum, an dem ein Auftrag ohne Unterschrifts- und Entscheid-Datum gezählt wird. Sonst zählte er am
 * Angebotsdatum, oft im Vorjahr (Chris 1.11.2026: Auftragswert «Dieses Jahr» viel zu tief). Nimmt den 1.1. des
 * Ordner-Jahrs in Adjudications, wenn das Angebot früher war; das Unterschriftsdatum aus dem Vertrag ist besser.
 * @param {Record<string, any>} p Offerte der Vorlage, Stand schon korrigiert
 * @param {Ablage} ablage
 * @returns {string | null} ISO-Datum oder null = nichts ändern
 */
export function auftragsDatum(p, ablage) {
  if (!GEWONNEN.includes(p.statusKey ?? '') || p.unterzeichnetAm || p.entscheidAm) return null
  const jahr = Number(ablage.ordner.get(ablageNummer(p.nr) ?? '')?.jahr ?? p._ausAblage?.jahr)
  if (!jahr) return null
  const angebot = String(p.angebotAm ?? '')
  return !angebot || Number(angebot.slice(0, 4)) < jahr ? `${jahr}-01-01` : null
}

/**
 * Liest von Hand geklärte Korrekturen (JSON in den Projektdateien, nie im Repo), z. B.
 * `{ "nummern": { "101658": "101659", "101659": "101658" } }` für vertauschte Offertnummern (Frage 18B).
 * @param {string} pfad
 * @returns {{ nummern: Record<string, string>, neue: import('./nachtraege.mjs').Nachtrag[], vertraege: import('./nachtraege.mjs').Vertrag[] }}
 */
export function leseKorrekturen(pfad) {
  const k = JSON.parse(readFileSync(pfad, 'utf8'))
  return { nummern: k.nummern ?? {}, neue: k.neue ?? [], vertraege: k.vertraege ?? [] }
}

/**
 * Setzt die richtige Offertnummer, bevor Ablage und Import sie lesen. Die alte bleibt in `_nrVorlage`.
 * @param {Record<string, Record<string, any>>} projekte Sammlung «projects» der Vorlage
 * @param {Record<string, string>} nummern alte Nummer → richtige Nummer
 * @returns {Korrektur[]}
 */
export function korrigiereNummern(projekte, nummern) {
  /** @type {Korrektur[]} */
  const korrekturen = []
  for (const [id, p] of Object.entries(projekte)) {
    const neu = nummern[String(p.nr ?? id)]
    if (!neu) continue
    korrekturen.push({ nr: String(p.nr), vorher: String(p.nr), nachher: neu, grund: 'Offertnummer von Hand geklärt' })
    p._nrVorlage = p.nr
    p.nr = /^\d+$/.test(neu) ? Number(neu) : neu
  }
  return korrekturen
}
