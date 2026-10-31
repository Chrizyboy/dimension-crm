// Kennzahlen (Dashboard) alt gegen neu: V233 dashMetrics gegen die Datenbank-Funktion kennzahlen_fakten,
// für jeden Zeitraum, je Standort und je Person, mit den Datensätzen hinter jeder Zahl.

import { dashMetrics, dashRange, leadStandort, offerPerson, offerStandort, PERSONS } from '../import/v233.mjs'
import { istMesseOhneWunsch, werkvertragBetrag } from '../import/entscheide.mjs'

const ZEITRAEUME = /** @type {const} */ (['monat', 'quartal', 'jahr', '12m', 'alle'])
const ANZAHL = [
  'leads_neu',
  'leads_offen',
  'termine',
  'kein_interesse',
  'wv_faellig',
  'gesendet',
  'offen',
  'nf_faellig',
  'angenommen',
  'verloren',
  'bau',
]
const NAMEN = /** @type {Record<string, string>} */ ({
  leads_neu: 'Neue Leads',
  leads_offen: 'Offene Leads',
  termine: 'Kundentermine',
  kein_interesse: 'Kein Interesse',
  wv_faellig: 'Wiedervorlage fällig',
  gesendet: 'Offerten gesendet',
  angebotswert: 'Angebotswert gesendet',
  offen: 'Offen ohne Entscheid',
  nf_faellig: 'Nachfassen fällig',
  angenommen: 'Angenommen',
  auftragswert: 'Auftragswert',
  verloren: 'Abgelehnt / verloren',
  quote: 'Abschlussquote',
  bau: 'Baustellen im Gange',
})

/**
 * @param {import('./vergleich.mjs').Befunde} b
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ leads: Record<string, any>[], projects: Record<string, any>[], mwst: number }} alt
 * @param {import('./laden.mjs').Neu} neu
 * @param {string} heute
 * @returns {Promise<Record<string, any>[]>} Tabelle für den Bericht
 */
export async function pruefeKennzahlen(b, db, alt, neu, heute) {
  // Für V233 zählen nur Leads ausserhalb des Papierkorbs. Messe-Teilnahmen ohne Beratungswunsch sind
  // nach Entscheid 13/15B keine Leads mehr: so erwartet, nicht als Abweichung gezählt.
  const st = {
    leads: alt.leads.filter((l) => !l._papierkorb && !istMesseOhneWunsch(l)),
    projects: alt.projects,
  }
  const projektNachId = new Map(alt.projects.map((p) => [String(p.id), p]))
  // Entscheid 11B: ohne Vertragswert zählt der Angebotswert plus MWST (V233 zeigte ihn exkl.).
  const auftragswert = (/** @type {string[]} */ ids) =>
    ids.reduce((s, id) => s + (werkvertragBetrag(projektNachId.get(id) ?? {}, alt.mwst).betrag ?? 0), 0)
  const altNr = (/** @type {string} */ art, /** @type {string} */ id) => {
    const tabelle = art === 'lead' ? 'verkaufschancen' : art === 'offerte' ? 'offerten' : 'projekte'
    const a = neu.nachId[tabelle]?.get(id)?.alt_id ?? `neu:${id}`
    return String(a).replace(/^(lead|project):/, '')
  }
  const vorname = (/** @type {string | null} */ id) =>
    id ? String(neu.nachId.personen.get(id)?.name ?? '').split(' ')[0] : ''
  /** @type {Record<string, any>[]} */
  const tabelle = []

  for (const z of ZEITRAEUME) {
    const r = dashRange(z, heute)
    /** @type {Record<string, any>[]} */
    const fakten = []
    for (let von = 0; ; von += 1000) {
      const { data, error } = await db
        .rpc('kennzahlen_fakten', { p_von: r[0] < '2000-01-01' ? '2000-01-01' : r[0], p_bis: heute })
        .order('schluessel')
        .order('id')
        .order('datum')
        .order('ort')
        .order('betrag_rappen')
        .range(von, von + 999)
      if (error) throw new Error(`kennzahlen_fakten: ${error.message}`)
      fakten.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }

    /** @type {[string, (l: any) => boolean, (p: any) => boolean, (f: any) => boolean][]} */
    const spalten = [
      ['Alle', () => true, () => true, () => true],
      ['Muri', (l) => leadStandort(l) === 'Muri', (p) => offerStandort(p) === 'Muri', (f) => f.standort === 'muri'],
      ['Bulle', (l) => leadStandort(l) === 'Bulle', (p) => offerStandort(p) === 'Bulle', (f) => f.standort === 'bulle'],
      ...PERSONS.map(
        (n) =>
          /** @type {[string, any, any, any]} */ ([
            n,
            (/** @type {any} */ l) => l.tourPerson === n,
            (/** @type {any} */ p) => offerPerson(p, st.leads) === n,
            (/** @type {any} */ f) => vorname(f.person_id) === n,
          ]),
      ),
    ]
    for (const [spalte, fl, fp, fn] of spalten) {
      const a = dashMetrics(st, fl, fp, r, heute)
      const n = fakten.filter(fn)
      for (const k of ANZAHL) {
        const ids = new Set(/** @type {string[]} */ (a[/** @type {keyof typeof a} */ (k)]))
        const nIds = new Set(n.filter((f) => f.schluessel === k).map((f) => altNr(f.art, f.id)))
        const fehlen = [...ids].filter((i) => !nIds.has(i))
        const zuviel = [...nIds].filter((i) => !ids.has(i))
        tabelle.push({ zeitraum: z, spalte, kennzahl: NAMEN[k], alt: ids.size, neu: nIds.size, fehlen, zuviel })
        b.vergleiche('Kennzahlen', `${z} · ${spalte}`, NAMEN[k] ?? k, ids.size, nIds.size, {
          grund:
            fehlen.length || zuviel.length
              ? `nur alt: ${fehlen.slice(0, 12).join(', ') || '–'} · nur neu: ${zuviel.slice(0, 12).join(', ') || '–'}`
              : undefined,
        })
      }
      const summe = (/** @type {string} */ s) =>
        n.filter((f) => f.schluessel === s).reduce((x, f) => x + Number(f.betrag_rappen ?? 0), 0)
      for (const [k, neuWert] of /** @type {[string, number | null][]} */ ([
        ['angebotswert', summe('gesendet')],
        ['auftragswert', summe('angenommen')],
        ['quote', quote(n)],
      ])) {
        const altWert = /** @type {number | null} */ (a[/** @type {keyof typeof a} */ (k)])
        const erwartet = k === 'auftragswert' ? auftragswert(a.angenommen) : altWert
        tabelle.push({ zeitraum: z, spalte, kennzahl: NAMEN[k], alt: altWert, erwartet, neu: neuWert })
        b.vergleiche('Kennzahlen', `${z} · ${spalte}`, NAMEN[k] ?? k, erwartet, neuWert, {
          grund: k === 'auftragswert' ? `V233 zeigte ${altWert} (Angebotswert exkl. MWST)` : undefined,
        })
      }
    }
  }
  return tabelle
}

/** @param {Record<string, any>[]} f */
function quote(f) {
  const an = f.filter((x) => x.schluessel === 'angenommen').length
  const aus = f.filter((x) => x.schluessel === 'verloren').length
  return an + aus === 0 ? null : Math.round((100 * an) / (an + aus))
}
