// Plausibilität der alten Daten (V233): Was schon im alten CRM nicht stimmen kann. Diese Liste ist für Chris
// zum Entscheiden; der Import übernimmt die Werte unverändert, ausser es ist ausdrücklich anders entschieden.

import { numVal, WON, LOST } from '../import/v233.mjs'

/** @typedef {{ bereich: string, datensatz: string, regel: string, wert: string, vorschlag: string }} Auffaelligkeit */

/** @param {unknown} v */
const t = (v) => (v === null || v === undefined ? '' : String(v).trim())
const datum = (/** @type {unknown} */ v) => (/^\d{4}-\d{2}-\d{2}/.test(t(v)) ? t(v).slice(0, 10) : '')
const chf = (/** @type {number} */ n) =>
  `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/’/g, "'")}`

/**
 * @param {import('../import/lesen.mjs').VorlageDaten} daten
 * @param {{ leads: Record<string, any>[], projects: Record<string, any>[] }} alt
 * @returns {Auffaelligkeit[]}
 */
export function pruefeAltdaten(daten, alt) {
  /** @type {Auffaelligkeit[]} */
  const a = []
  const dazu = (/** @type {Auffaelligkeit} */ x) => a.push(x)
  const heute = daten.at.slice(0, 10)
  const leads = alt.leads.filter((l) => !l._papierkorb)
  const leadNachId = new Map(alt.leads.map((l) => [l.id, l]))

  // Offerten
  /** @type {Map<string, string[]>} */
  const nummern = new Map()
  for (const p of alt.projects) nummern.set(t(p.nr), [...(nummern.get(t(p.nr)) ?? []), p.id])
  for (const [nr, ids] of nummern)
    if (ids.length > 1)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Offertnummer doppelt',
        wert: ids.join(', '),
        vorschlag: 'Eine der Offerten umnummerieren (Import: «nr-ID»)',
      })

  for (const p of alt.projects) {
    const nr = t(p.nr) || p.id
    const won = WON.includes(p.statusKey)
    const angebot = numVal(p.angebotswert)
    const vertrag = numVal(p.vertragswert)
    const unterz = datum(p.unterzeichnetAm)
    if (unterz && (unterz < '2015-01-01' || unterz > heute))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Unterschriftsdatum unmöglich',
        wert: unterz,
        vorschlag: 'Datum korrigieren oder leeren',
      })
    if (unterz && datum(p.angebotAm) && unterz < datum(p.angebotAm))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Unterschrieben vor dem Angebotsdatum',
        wert: `${unterz} < ${datum(p.angebotAm)}`,
        vorschlag: 'eines der Daten prüfen',
      })
    if (datum(p.angebotAm) > heute)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Angebotsdatum in der Zukunft',
        wert: datum(p.angebotAm),
        vorschlag: 'Datum prüfen (zählt erst ab diesem Tag als gesendet)',
      })
    if (won && !unterz)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Angenommen ohne Unterschriftsdatum',
        wert: p.statusKey,
        vorschlag: 'Datum nachtragen (zählt sonst mit Entscheid-/Angebotsdatum)',
      })
    if (!won && unterz && !LOST.includes(p.statusKey))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Unterschrieben, aber Status nicht angenommen',
        wert: `${p.statusKey || '(leer)'} · ${unterz}`,
        vorschlag: 'Status auf «angenommen» setzen?',
      })
    if (LOST.includes(p.statusKey) && unterz)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Verloren, aber unterschrieben',
        wert: `${p.statusKey} · ${unterz}`,
        vorschlag: 'Status oder Datum prüfen',
      })
    if (won && !vertrag)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Auftrag ohne Vertragswert',
        wert: angebot ? `Angebot ${chf(angebot)} exkl.` : 'auch kein Angebotswert',
        vorschlag: 'Vertragswert nachtragen (zählt sonst ungenau im Auftragswert)',
      })
    if (['sent', ...WON].includes(p.statusKey) && !angebot)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Gesendet/angenommen ohne Angebotswert',
        wert: p.statusKey,
        vorschlag: 'Betrag aus der Offerte (PDF/Eturnity) nachtragen',
      })
    if (p.statusKey === 'sent' && !datum(p.angebotAm))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Gesendet ohne Angebotsdatum',
        wert: '',
        vorschlag: 'Datum nachtragen (sonst sofort «nachfassen»)',
      })
    if (vertrag && angebot) {
      const faktor = vertrag / angebot
      if (faktor < 0.85 || faktor > 1.25)
        dazu({
          bereich: 'Offerten',
          datensatz: nr,
          regel: 'Vertragswert passt nicht zum Angebot (erwartet ≈ +8.1 % MWST)',
          wert: `Vertrag ${chf(vertrag)} · Angebot ${chf(angebot)} · Faktor ${faktor.toFixed(3)}`,
          vorschlag: 'einen der Beträge prüfen',
        })
    }
    if (p.entscheid === 'angenommen' && !won)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Entscheid «angenommen», Status nicht',
        wert: p.statusKey || '(leer)',
        vorschlag: 'Status nachführen',
      })
    if (p.entscheid === 'abgelehnt' && !LOST.includes(p.statusKey))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Entscheid «abgelehnt», Status nicht verloren',
        wert: p.statusKey || '(leer)',
        vorschlag: 'Status nachführen',
      })
    if (/[^\d.\s]/.test(t(p.leistung)) && t(p.leistung))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Leistung ist keine Zahl',
        wert: t(p.leistung),
        vorschlag: 'kWp eintragen',
      })
    if (/\+/.test(t(p.anzahlModule)))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Anzahl Module als Rechnung',
        wert: t(p.anzahlModule),
        vorschlag: 'als Summe übernehmen',
      })
    const l = t(p.leadId) ? leadNachId.get(t(p.leadId)) : null
    if (t(p.leadId) && !l)
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Verweist auf unbekannten Lead',
        wert: t(p.leadId),
        vorschlag: 'Verweis leeren',
      })
    if (l && Number(l.kundenNr) !== Number(p.kundenNr))
      dazu({
        bereich: 'Offerten',
        datensatz: nr,
        regel: 'Kundennummer anders als beim Lead',
        wert: `Offerte K${p.kundenNr} · Lead ${l.id} K${l.kundenNr}`,
        vorschlag: 'denselben Kunden verwenden',
      })
  }

  // Leads
  for (const l of leads) {
    if (l.status === 'Abgeschlossen' && !t(l.projectId))
      dazu({
        bereich: 'Leads',
        datensatz: l.id,
        regel: 'Abgeschlossen ohne Offerte',
        wert: '',
        vorschlag: 'Offerte verknüpfen oder Stand prüfen',
      })
    if (['Neu', 'Offen'].includes(l.status) && datum(l.tDate) && datum(l.tDate) < heute)
      dazu({
        bereich: 'Leads',
        datensatz: l.id,
        regel: 'Termin vorbei, Stand noch offen',
        wert: `${l.status} · Termin ${datum(l.tDate)}`,
        vorschlag: 'Stand nachführen',
      })
    if (!Number(l.kundenNr))
      dazu({ bereich: 'Leads', datensatz: l.id, regel: 'ohne Kundennummer', wert: '', vorschlag: 'Kunde zuordnen' })
  }

  // Mögliche Dubletten: verschiedene Kundennummern mit derselben E-Mail oder demselben Telefon.
  /** @type {Map<string, Set<number>>} */
  const nachMerkmal = new Map()
  const merke = (/** @type {string} */ m, /** @type {unknown} */ nr) => {
    if (!m || !Number(nr)) return
    nachMerkmal.set(m, (nachMerkmal.get(m) ?? new Set()).add(Number(nr)))
  }
  for (const l of leads) {
    merke(`Mail ${t(l.mail).toLowerCase()}`, l.kundenNr)
    if (t(l.tel).replace(/\D/g, '').length >= 9) merke(`Telefon ${t(l.tel).replace(/\D/g, '').slice(-9)}`, l.kundenNr)
  }
  for (const p of alt.projects) {
    merke(`Mail ${t(p.email).toLowerCase()}`, p.kundenNr)
    if (t(p.tel).replace(/\D/g, '').length >= 9) merke(`Telefon ${t(p.tel).replace(/\D/g, '').slice(-9)}`, p.kundenNr)
  }
  for (const [m, nrs] of nachMerkmal)
    if (nrs.size > 1 && !/^Mail $/.test(m))
      dazu({
        bereich: 'Kunden',
        datensatz: [...nrs].map((n) => `K${String(n).padStart(4, '0')}`).join(' · '),
        regel: 'Mögliche Dublette (gleiche Angabe, andere Kundennummer)',
        wert: m,
        vorschlag: 'prüfen, ob derselbe Kunde',
      })

  // Preisliste: V233 rechnete den Verkaufspreis aus dem Einkauf (EK × (1 + Marge) × (1 + Skonto)).
  // «brutto» ist der Listenpreis des Lieferanten; wo er fehlt, ist das kein Fehler. Ohne EK gibt es keinen Preis.
  for (const [id, x] of Object.entries(daten.cols.preisartikel ?? {})) {
    const lief = (Array.isArray(x.lief) ? x.lief : []).filter((/** @type {any} */ l) => numVal(l.ek))
    if (!x.archiviert && !numVal(x.ek) && lief.length === 0)
      dazu({
        bereich: 'Preisliste',
        datensatz: t(x.artnr) || id,
        regel: 'ohne Einkaufspreis (kein Verkaufspreis berechenbar)',
        wert: t(x.name),
        vorschlag: 'EK nachtragen oder Artikel archivieren',
      })
    const brutto = numVal(x.brutto)
    const ek = numVal(x.ek)
    if (brutto && ek && x.rabatt != null && Math.abs(brutto * (1 - numVal(x.rabatt)) - ek) > 0.05)
      dazu({
        bereich: 'Preisliste',
        datensatz: t(x.artnr) || id,
        regel: 'Einkauf ≠ Listenpreis × (1 − Rabatt)',
        wert: `EK ${chf(ek)} · Liste ${chf(brutto)} · Rabatt ${Math.round(numVal(x.rabatt) * 1000) / 10} %`,
        vorschlag: 'Rabatt oder EK prüfen',
      })
  }

  // Finanzen
  for (const [id, z] of Object.entries(daten.cols.finpay ?? {}))
    if (!numVal(z.betrag))
      dazu({
        bereich: 'Zahlungen',
        datensatz: t(z.firma) || id,
        regel: 'ohne Betrag',
        wert: t(z.text),
        vorschlag: 'Betrag nachtragen (fehlt sonst in der Liquidität)',
      })
  return a
}
