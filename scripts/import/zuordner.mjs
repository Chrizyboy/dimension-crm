// Ordnet alte Texte der Vorlage den Auswahlwerten der Datenbank zu (Tabelle «auswahlwerte»).
// Die Zuordnung steht als Daten in eigenschaften.vorlage, nicht im Code (CLAUDE.md Regel 8).

import { text } from './umwandeln.mjs'

/** @typedef {{ liste: string, schluessel: string, eigenschaften: { vorlage?: string[] } }} Auswahlwert */

/**
 * Hilfe zum Zuordnen mit Fehlerliste. Unbekannte Werte in strengen Listen landen im Zählbericht,
 * damit kein Status still verloren geht.
 */
export class Zuordner {
  /** @param {Auswahlwert[]} werte */
  constructor(werte) {
    /** @type {Map<string, Map<string, string>>} */
    this.karten = new Map()
    for (const w of werte) {
      const karte = this.karten.get(w.liste) ?? new Map()
      karte.set(w.schluessel.toLowerCase(), w.schluessel)
      for (const alt of w.eigenschaften.vorlage ?? []) karte.set(alt.toLowerCase(), w.schluessel)
      this.karten.set(w.liste, karte)
    }
    /** @type {{ liste: string, wert: string, wo: string }[]} */
    this.unbekannt = []
  }

  /**
   * Streng: unbekannte Werte werden gemeldet und ergeben den Ersatzwert.
   * @param {string} liste
   * @param {unknown} roh
   * @param {string} wo Herkunft für den Bericht, z. B. «leads/L001»
   * @param {string | null} [ersatz]
   * @returns {string | null}
   */
  streng(liste, roh, wo, ersatz = null) {
    const karte = this.karten.get(liste)
    const t = String(roh ?? '').trim()
    const treffer = karte?.get(t.toLowerCase())
    if (treffer) return treffer
    if (t === '' || t === 'None') return ersatz
    this.unbekannt.push({ liste, wert: t, wo })
    return ersatz
  }

  /**
   * Locker: bekannte Werte werden zugeordnet, unbekannte bleiben als Text erhalten.
   * @param {string} liste
   * @param {unknown} roh
   * @returns {string | null}
   */
  locker(liste, roh) {
    const t = text(roh)
    if (!t) return null
    return this.karten.get(liste)?.get(t.toLowerCase()) ?? t
  }
}
