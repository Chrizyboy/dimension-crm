// Reine Umwandlungs-Helfer für den Import der Vorlage V233. Ohne Datenbank, deshalb gut testbar.
// Die Vorlage speicherte Werte uneinheitlich: Beträge als Text («24713.00»), Sprache als «Deutsch» …

/**
 * Wandelt einen Betrag in Franken (Zahl oder Text, auch «12'500.00») in Rappen als Ganzzahl.
 * @param {unknown} wert
 * @returns {number | null} null bei leerem oder unlesbarem Wert
 */
export function zuRappen(wert) {
  if (wert === null || wert === undefined || wert === '') return null
  const zahl =
    typeof wert === 'number'
      ? wert
      : Number(
          String(wert)
            .replace(/['’\s]/g, '')
            .replace(',', '.'),
        )
  return Number.isFinite(zahl) ? Math.round(zahl * 100) : null
}

/**
 * Liest eine Zahl aus Zahl oder Text. Leere Werte ergeben null.
 * @param {unknown} wert
 * @returns {number | null}
 */
export function zuZahl(wert) {
  if (wert === null || wert === undefined || wert === '') return null
  const zahl = typeof wert === 'number' ? wert : Number(String(wert).replace(',', '.'))
  return Number.isFinite(zahl) ? zahl : null
}

/**
 * Liest eine ganze Zahl (z. B. Anzahl Module). Kommazahlen werden gerundet.
 * @param {unknown} wert
 * @returns {number | null}
 */
export function zuGanzzahl(wert) {
  const zahl = zuZahl(wert)
  return zahl === null ? null : Math.round(zahl)
}

/**
 * Anzahl Module: wie zuGanzzahl, aber «24+3» (so in V233 erfasst) ergibt die Summe 27.
 * @param {unknown} wert
 * @returns {number | null}
 */
export function zuModulzahl(wert) {
  const t = text(wert)
  if (t && /^\d+(\s*\+\s*\d+)+$/.test(t)) return t.split('+').reduce((s, x) => s + Number(x), 0)
  return zuGanzzahl(wert)
}

/**
 * Leerer Text wird null, sonst getrimmt.
 * @param {unknown} wert
 * @returns {string | null}
 */
export function text(wert) {
  if (wert === null || wert === undefined) return null
  const t = String(wert).trim()
  return t === '' || t === 'None' ? null : t
}

/**
 * Datum im Format JJJJ-MM-TT aus Datum oder Zeitstempel; ungültige Werte ergeben null.
 * @param {unknown} wert
 * @returns {string | null}
 */
export function zuDatum(wert) {
  const t = text(wert)
  if (!t) return null
  const treffer = /^(\d{4}-\d{2}-\d{2})/.exec(t)
  return treffer ? (treffer[1] ?? null) : null
}

/**
 * Zeitstempel unverändert übernehmen, wenn er gültig ist.
 * @param {unknown} wert
 * @returns {string | null}
 */
export function zuZeitstempel(wert) {
  const t = text(wert)
  if (!t || Number.isNaN(Date.parse(t))) return null
  return new Date(t).toISOString()
}

/**
 * Datum und Uhrzeit (Ortszeit Schweiz) zu einem Zeitpunkt mit korrekter Sommer-/Winterzeit.
 * @param {unknown} datum JJJJ-MM-TT
 * @param {unknown} zeit HH:MM, ohne Zeit gilt 00:00
 * @returns {string | null} ISO-Zeitpunkt in UTC
 */
export function zuOrtszeit(datum, zeit) {
  const d = zuDatum(datum)
  if (!d) return null
  const z = /^\d{1,2}:\d{2}$/.test(text(zeit) ?? '') ? String(zeit).padStart(5, '0') : '00:00'
  const alsUtc = new Date(`${d}T${z}:00Z`)
  // Versatz der Zone Europe/Zurich an diesem Tag (+01:00 oder +02:00)
  const teil = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', timeZoneName: 'longOffset' })
    .formatToParts(alsUtc)
    .find((p) => p.type === 'timeZoneName')?.value
  const treffer = /GMT([+-])(\d{2}):(\d{2})/.exec(teil ?? '')
  const minuten = treffer ? (treffer[1] === '-' ? -1 : 1) * (Number(treffer[2]) * 60 + Number(treffer[3])) : 0
  return new Date(alsUtc.getTime() - minuten * 60_000).toISOString()
}

/**
 * Sprache der Vorlage («Deutsch», «Französisch», «fr» …) als Code 'de' oder 'fr'.
 * @param {unknown} wert
 * @param {'de' | 'fr'} [standard]
 * @returns {'de' | 'fr'}
 */
export function zuSprache(wert, standard = 'de') {
  const t = (text(wert) ?? '').toLowerCase()
  if (t.startsWith('fr')) return 'fr'
  if (t.startsWith('de')) return 'de'
  return standard
}

/**
 * «Ja»/«Nein» und true/false zu Wahrheitswert; alles andere null.
 * @param {unknown} wert
 * @returns {boolean | null}
 */
export function zuJaNein(wert) {
  if (wert === true || wert === false) return wert
  const t = (text(wert) ?? '').toLowerCase()
  if (t === 'ja') return true
  if (t === 'nein') return false
  return null
}

/**
 * Trennt einen vollen Namen in Vor- und Nachname. Der letzte Teil gilt als Nachname,
 * weil die Vorlage Namen als «Vorname Nachname» erfasst hat.
 * @param {unknown} name
 * @returns {{ vorname: string | null, nachname: string | null }}
 */
export function trenneName(name) {
  const teile = (text(name) ?? '').split(/\s+/).filter(Boolean)
  if (teile.length === 0) return { vorname: null, nachname: null }
  if (teile.length === 1) return { vorname: null, nachname: teile[0] ?? null }
  return { vorname: teile.slice(0, -1).join(' '), nachname: teile.at(-1) ?? null }
}

/**
 * Schlüssel zum Erkennen derselben Adresse (Gross/Klein, Leerzeichen und «str.» egal).
 * @param {{ strasse?: unknown, plz?: unknown, ort?: unknown }} adresse
 * @returns {string}
 */
export function adressSchluessel({ strasse, plz, ort }) {
  const norm = (/** @type {unknown} */ w) =>
    (text(w) ?? '')
      .toLowerCase()
      .replace(/str\.(\s|$)/g, 'strasse$1')
      .replace(/\s+/g, ' ')
  return [norm(strasse), norm(plz), norm(ort)].join('|')
}

/**
 * Entfernt Felder aus einem Datensatz, die nie ins neue CRM gehören (z. B. Passwort-Hashes).
 * @param {Record<string, unknown>} datensatz
 * @param {string[]} felder
 * @returns {Record<string, unknown>}
 */
export function ohne(datensatz, felder) {
  const kopie = { ...datensatz }
  for (const f of felder) delete kopie[f]
  return kopie
}

/**
 * Register-Freigaben der Vorlage («regs», V118) als Bereiche des neuen CRM.
 * Ein Register kann mehrere Bereiche ergeben (Kunden = Kunden + Adressbuch). Fehlt «regs», sieht die Person alles.
 * «heute» und «einstellungen» waren immer sichtbar und brauchen keinen Eintrag.
 * @type {Record<string, string[]>}
 */
const REGISTER_ZU_BEREICHEN = {
  dashboard: ['dashboard'],
  marketing: ['marketing'],
  leads: ['sales', 'tenders'],
  offerten: ['quotes', 'workcontracts'],
  preise: ['quotes'],
  kunden: ['customers', 'contacts'],
  bauplanung: ['projects', 'purchasing', 'fieldwork'],
  vertraege: ['contracts'],
  rechnungen: ['invoices'],
  aftersales: ['aftersales'],
}

/**
 * @param {unknown} regs
 * @returns {string[]} leer = alle Bereiche
 */
export function bereicheAusRegistern(regs) {
  if (!Array.isArray(regs)) return []
  const bereiche = new Set(regs.flatMap((r) => REGISTER_ZU_BEREICHEN[String(r)] ?? []))
  // Spesen waren in der Vorlage für alle offen.
  if (bereiche.size > 0) bereiche.add('expenses')
  return [...bereiche]
}
