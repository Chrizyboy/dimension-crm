// Nachbau der Rechenregeln der Vorlage V233, damit der Abgleich weiss, was das alte CRM angezeigt hat.
// Quelle: CRM-Dimension-Solaire-V233.html (numVal, leadStandort, offerStandort, offerPerson, dashMetrics,
// finFlows, finForecast). Bewusst nahe am Original geschrieben, damit man es Zeile für Zeile vergleichen kann.

/** V233 PERSONS und TOUR_PERSONS (Zeilen 11902 und 6681). */
export const PERSONS = ['Loris', 'Chris', 'Andreas', 'Filipe']
export const TOUR_PERSONS = ['Chris', 'Loris', 'Filipe']
/** Tage nach dem Versand bis zum Nachfassen (FU_DAYS). */
export const FU_DAYS = 14
export const WON = ['closed', 'construction', 'done']
export const LOST = ['lost', 'archived']

/**
 * V233 numVal: Zahl aus Zahl oder Text («12'500.00», «CHF 1'200», «12,5»); unlesbar = 0.
 * @param {unknown} v
 * @returns {number}
 */
export function numVal(v) {
  if (typeof v === 'number') return v
  const n = parseFloat(
    String(v || '')
      .replace(/[’'\s]/g, '')
      .replace(/CHF/i, '')
      .replace(/,(\d{1,2})$/, '.$1')
      .replace(/,/g, ''),
  )
  return Number.isFinite(n) ? n : 0
}

/**
 * Franken wie V233 gerechnet, als Rappen-Ganzzahl.
 * @param {unknown} v
 */
export const rappenWieV233 = (v) => Math.round(numVal(v) * 100)

/**
 * Standort eines Leads (V233 leadStandort).
 * @param {Record<string, any>} l
 * @returns {'Muri' | 'Bulle'}
 */
export function leadStandort(l) {
  if (l.zu === 'Muri' || l.zu === 'Bulle') return l.zu
  if (l.zu === 'Andy' && (l.zuvon === 'Muri' || l.zuvon === 'Bulle')) return l.zuvon
  return l.erst === 'Bulle' ? 'Bulle' : 'Muri'
}

/**
 * Standort einer Offerte (V233 offerStandort): Französisch = Bulle, sonst Muri.
 * @param {Record<string, any>} p
 * @returns {'Muri' | 'Bulle'}
 */
export const offerStandort = (p) => (p.lang === 'fr' ? 'Bulle' : 'Muri')

/**
 * Lead zur Offerte (V233 fuLead): über leadId, sonst der Lead, der auf die Offerte zeigt.
 * @param {Record<string, any>} p
 * @param {Record<string, any>[]} leads mit Feld id
 */
export function fuLead(p, leads) {
  return (p.leadId && leads.find((x) => x.id === p.leadId)) || leads.find((x) => x.projectId === p.id) || null
}

/**
 * «Verantwortlich» einer Offerte, wie V233 sie anzeigt und zählt (offerPerson / fuAuto, V134 und V225).
 * @param {Record<string, any>} p mit Feld id
 * @param {Record<string, any>[]} leads
 * @returns {string}
 */
export function offerPerson(p, leads) {
  if (p.vmanuell && PERSONS.includes(p.verantwortlich)) return p.verantwortlich
  if (offerStandort(p) === 'Bulle') return 'Filipe'
  const l = fuLead(p, leads)
  if (l && l.tDate) return TOUR_PERSONS.includes(l.tourPerson) ? l.tourPerson : 'Loris'
  return 'Andreas'
}

/** @param {Record<string, any>} l */
export const leadEntryDate = (l) => l.rec || String(l.createdAt || '').slice(0, 10) || ''

/**
 * Zeitraum wie V233 dashRange (Ortszeit), «heute» von aussen, damit Alt und Neu am selben Tag rechnen.
 * @param {'monat' | 'quartal' | 'jahr' | '12m' | 'alle'} periode
 * @param {string} heute JJJJ-MM-TT
 * @returns {[string, string]}
 */
export function dashRange(periode, heute) {
  const [y, m, d] = heute.split('-').map(Number)
  const iso = (/** @type {number} */ j, /** @type {number} */ mo, /** @type {number} */ t) =>
    new Date(Date.UTC(j, mo, t)).toISOString().slice(0, 10)
  if (periode === 'monat') return [iso(y, m - 1, 1), heute]
  if (periode === 'quartal') return [iso(y, m - 1 - ((m - 1) % 3), 1), heute]
  if (periode === 'jahr') return [iso(y, 0, 1), heute]
  if (periode === '12m') return [iso(y - 1, m - 1, d + 1), heute]
  return ['0000-00-00', '9999-12-31']
}

const inRange = (/** @type {unknown} */ iso, /** @type {[string, string]} */ r) =>
  !!iso && String(iso).slice(0, 10) >= r[0] && String(iso).slice(0, 10) <= r[1]

/** @param {string} iso @param {number} n */
export function isoAdd(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** @param {Record<string, any>} p @param {string} heute */
export function offerFollowUpDue(p, heute) {
  if (!p || p.statusKey !== 'sent') return false
  const date = p.nachfolgeTermin || (p.angebotAm ? isoAdd(p.angebotAm, FU_DAYS) : '')
  return !date || date <= heute
}

/** @param {Record<string, any>} l @param {string} heute */
export function leadFollowUpDue(l, heute) {
  return !!(l && l.wvDatum && ['Neu', 'Offen', 'Warten'].includes(l.status) && l.wvDatum <= heute)
}

/**
 * Kennzahlen des Dashboards (V233 dashMetrics), jede Kennzahl mit den Datensätzen dahinter.
 * Zahlungen und Aftersales fehlen: im Export gibt es keine (projects.zahlungen und cases leer).
 * @param {{ leads: Record<string, any>[], projects: Record<string, any>[] }} st
 * @param {(l: Record<string, any>) => boolean} filterLead
 * @param {(p: Record<string, any>) => boolean} filterOffer
 * @param {[string, string]} r
 * @param {string} heute
 */
export function dashMetrics(st, filterLead, filterOffer, r, heute) {
  const L = st.leads.filter(filterLead)
  const P = st.projects.filter(filterOffer)
  const won = P.filter(
    (p) => WON.includes(p.statusKey) && inRange(p.unterzeichnetAm || p.entscheidAm || p.angebotAm, r),
  )
  const lost = P.filter((p) => LOST.includes(p.statusKey) && inRange(p.entscheidAm || p.angebotAm, r))
  const sent = P.filter((p) => p.angebotAm && inRange(p.angebotAm, r))
  const ids = (/** @type {Record<string, any>[]} */ a) => a.map((x) => x.id)
  return {
    leads_neu: ids(L.filter((l) => inRange(leadEntryDate(l), r))),
    leads_offen: ids(L.filter((l) => ['Neu', 'Offen', 'Warten'].includes(l.status))),
    termine: ids(L.filter((l) => l.tDate && inRange(l.tDate, r))),
    kein_interesse: ids(L.filter((l) => l.status === 'Kunde kein Interesse' && inRange(leadEntryDate(l), r))),
    wv_faellig: ids(L.filter((l) => leadFollowUpDue(l, heute))),
    gesendet: ids(sent),
    angebotswert: Math.round(sent.reduce((s, p) => s + numVal(p.angebotswert), 0) * 100),
    offen: ids(P.filter((p) => p.statusKey === 'sent')),
    nf_faellig: ids(P.filter((p) => offerFollowUpDue(p, heute))),
    angenommen: ids(won),
    auftragswert: Math.round(won.reduce((a, p) => a + (numVal(p.vertragswert) || numVal(p.angebotswert)), 0) * 100),
    verloren: ids(lost),
    quote: won.length + lost.length ? Math.round((100 * won.length) / (won.length + lost.length)) : null,
    bau: ids(P.filter((p) => p.statusKey === 'construction')),
  }
}
