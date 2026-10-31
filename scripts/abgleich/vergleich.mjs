// Gemeinsame Bausteine des Abgleichs: Befunde sammeln und Werte gerecht vergleichen
// (leer = leer, Zahlen als Zahl, Text ohne Rand-Leerzeichen, Datum nur der Tag).

/**
 * @typedef {{
 *   bereich: string,
 *   datensatz: string,
 *   feld: string,
 *   alt: unknown,
 *   neu: unknown,
 *   art: 'fehler' | 'hinweis' | 'altdaten',
 *   grund?: string,
 * }} Befund
 * fehler = neues CRM zeigt etwas anderes als das alte; hinweis = bewusst anders (z. B. MWST),
 * altdaten = schon im alten CRM unplausibel.
 */

export class Befunde {
  constructor() {
    /** @type {Befund[]} */
    this.liste = []
    /** @type {Map<string, number>} geprüfte Werte je Bereich */
    this.geprueft = new Map()
  }

  /**
   * @param {Befund} b
   */
  melde(b) {
    this.liste.push(b)
  }

  /**
   * Vergleicht einen Wert und meldet nur Abweichungen.
   * @param {string} bereich
   * @param {string} datensatz
   * @param {string} feld
   * @param {unknown} alt erwarteter Wert (wie V233 ihn zeigt)
   * @param {unknown} neu Wert im neuen CRM
   * @param {{ grund?: string, art?: Befund['art'] }} [mehr]
   * @returns {boolean} gleich
   */
  vergleiche(bereich, datensatz, feld, alt, neu, mehr = {}) {
    this.geprueft.set(bereich, (this.geprueft.get(bereich) ?? 0) + 1)
    if (gleich(alt, neu)) return true
    this.liste.push({ bereich, datensatz, feld, alt, neu, art: mehr.art ?? 'fehler', grund: mehr.grund })
    return false
  }
}

/**
 * @param {unknown} w
 * @returns {unknown}
 */
export function normiert(w) {
  if (w === undefined || w === null) return null
  if (typeof w === 'string') {
    const t = w.trim()
    if (t === '' || t === 'None') return null
    if (/^\d{4}-\d{2}-\d{2}([T ]00:00(:00(\.0+)?)?(Z|\+00(:00)?)?)?$/.test(t)) return t.slice(0, 10)
    return t
  }
  if (typeof w === 'number') return Number.isFinite(w) ? Math.round(w * 1e6) / 1e6 : null
  if (Array.isArray(w)) return w.length === 0 ? null : JSON.stringify(w)
  if (typeof w === 'object') return Object.keys(w).length === 0 ? null : JSON.stringify(w)
  return w
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
export function gleich(a, b) {
  const x = normiert(a)
  const y = normiert(b)
  if (x === y) return true
  if (typeof x === 'string' && typeof y === 'string') return x.toLowerCase() === y.toLowerCase()
  if (typeof x === 'number' && typeof y === 'string') return String(x) === y
  if (typeof y === 'number' && typeof x === 'string') return String(y) === x
  return false
}

/**
 * Leer gilt bei Beträgen wie 0 (V233 zeigte leere Beträge als 0 bzw. «–»).
 * @param {unknown} w
 */
export const nullWieNull = (w) => (w === null || w === undefined || w === 0 ? null : w)

/**
 * Zeitpunkt (UTC) als Datum und Uhrzeit in Ortszeit Schweiz.
 * @param {string | null | undefined} ts
 * @returns {{ datum: string | null, zeit: string | null }}
 */
export function ortszeit(ts) {
  if (!ts) return { datum: null, zeit: null }
  const d = new Date(ts)
  const datum = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
  const zeit = d.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })
  return { datum, zeit }
}
