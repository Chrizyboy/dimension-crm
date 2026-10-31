// Schritt 3: Kontakte und Objekte. Die Vorlage hatte keine Kunden-Tabelle: Ein Kunde war nur die
// Kundennummer auf Lead und Offerte. Hier entsteht daraus pro Nummer ein Kontakt und pro Adresse ein Objekt.

import { adressSchluessel, text, trenneName, zuSprache, zuZeitstempel } from '../umwandeln.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */
/** @typedef {{ art: 'lead' | 'projekt' | 'ordner', datensatz: Record<string, any>, zeit: string }} Quelle */

const FIRMEN_ENDUNG = /\b(ag|sa|gmbh|sàrl|sarl|sa|kg|genossenschaft|stiftung|verein)\b\.?$/i

/**
 * Alle Leads der Vorlage, auch die im Papierkorb (dort als Kopie unter «data»).
 * @param {Kontext} k
 * @returns {{ nummer: string, lead: Record<string, any>, geloescht_am: string | null, sammlung: string, schluessel: string }[]}
 */
export function alleLeads(k) {
  const aktiv = Object.entries(k.sammlung('leads')).map(([nummer, lead]) => ({
    nummer,
    lead,
    geloescht_am: null,
    sammlung: 'leads',
    schluessel: nummer,
  }))
  const geloescht = Object.entries(k.sammlung('trash'))
    .filter(([, t]) => t.kind === 'lead' && t.data)
    .map(([schluessel, t]) => ({
      nummer: String(t.nr ?? t.origId),
      lead: { ...t.data, kundenNr: t.data.kundenNr ?? t.kundenNr },
      geloescht_am: zuZeitstempel(t.deletedAt),
      sammlung: 'trash',
      schluessel,
    }))
  return [...aktiv, ...geloescht]
}

/**
 * Sammelt pro Kundennummer alle Datensätze, die etwas über den Kunden sagen.
 * @param {Kontext} k
 * @returns {Map<number, Quelle[]>}
 */
function quellenProKunde(k) {
  /** @type {Map<number, Quelle[]>} */
  const karte = new Map()
  const dazu = (/** @type {unknown} */ nr, /** @type {Quelle} */ q) => {
    const n = Number(nr)
    if (!Number.isInteger(n) || n <= 0) return
    karte.set(n, [...(karte.get(n) ?? []), q])
  }
  for (const { lead } of alleLeads(k)) dazu(lead.kundenNr, { art: 'lead', datensatz: lead, zeit: lead.updatedAt ?? '' })
  for (const p of Object.values(k.sammlung('projects')))
    dazu(p.kundenNr, { art: 'projekt', datensatz: p, zeit: p.updatedAt ?? '' })
  for (const [key, o] of Object.entries(k.sammlung('kbfolders')))
    dazu(key.slice(1), { art: 'ordner', datensatz: o, zeit: '' })
  for (const a of Object.values(k.sammlung('activities'))) dazu(a.kundenNr, { art: 'ordner', datensatz: {}, zeit: '' })
  for (const f of Object.values(k.sammlung('kbfiles')))
    dazu(String(f.key ?? '').slice(1), { art: 'ordner', datensatz: {}, zeit: '' })
  return karte
}

/**
 * Baut einen Kontakt aus den Quellen: der neueste Lead zählt zuerst, dann die neueste Offerte.
 * @param {number} nr
 * @param {Quelle[]} quellen
 */
export function baueKontakt(nr, quellen) {
  const sortiert = [...quellen].sort((a, b) =>
    a.art === b.art
      ? b.zeit.localeCompare(a.zeit)
      : a.art === 'lead'
        ? -1
        : b.art === 'lead'
          ? 1
          : a.art === 'projekt'
            ? -1
            : 1,
  )
  const erstes = (/** @type {(d: Record<string, any>, art: string) => unknown} */ f) => {
    for (const q of sortiert) {
      const w = text(f(q.datensatz, q.art))
      if (w) return w
    }
    return null
  }
  const vorname = erstes((d, art) => (art === 'projekt' ? d.vornameMO : d.vorname))
  const nachname = erstes((d, art) => (art === 'projekt' ? d.nameMO : d.nachname))
  const getrennt = trenneName(erstes((d, art) => (art === 'lead' ? d.name : art === 'projekt' ? d.kontakt : null)))
  const ordnerName = erstes((d, art) => (art === 'ordner' ? String(d.name ?? '').replace(/^K\d+\s*/, '') : null))
  const firma = erstes((d) => d.firma) ?? (ordnerName && FIRMEN_ENDUNG.test(ordnerName) ? ordnerName : null)
  const ohneName = !vorname && !nachname && !getrennt.nachname
  return {
    kundennummer: nr,
    art: firma && !vorname && !nachname ? 'firma' : 'person',
    kontaktart: firma && !vorname && !nachname ? 'firma' : 'privat',
    anrede: erstes((d) => d.anrede),
    vorname: vorname ?? (nachname ? null : getrennt.vorname),
    nachname: nachname ?? getrennt.nachname ?? (ohneName && !firma ? ordnerName : null),
    firma,
    email: erstes((d) => d.mail ?? d.email)?.toLowerCase() ?? null,
    telefon: erstes((d) => d.tel),
    sprache: zuSprache(
      erstes((d, art) => (art === 'projekt' ? d.lang : (d.sprache ?? d.lang))),
      quellen.some((q) => q.art === 'projekt' && q.datensatz.lang === 'fr') ? 'fr' : 'de',
    ),
    werbesperre: quellen.some((q) => q.datensatz.keineWerbung === true),
    einwilligung: einwilligungAusMesse(quellen),
  }
}

/**
 * Einwilligung für Werbung aus dem Messe-Formular der Vorlage (leads.messe), die erste erteilte gilt.
 * Format wie im neuen CRM: {quelle, datum, kanal} (revDSG), dazu Anlass und Formular zur Nachvollziehbarkeit.
 * @param {Quelle[]} quellen
 */
export function einwilligungAusMesse(quellen) {
  const erteilt = quellen
    .filter((q) => q.art === 'lead' && q.datensatz.messe?.einwilligung === true)
    .map((q) => /** @type {Record<string, any>} */ (q.datensatz.messe))
    .sort((a, b) => String(a.at ?? '').localeCompare(String(b.at ?? '')))
  const m = erteilt[0]
  if (!m) return null
  return {
    quelle: 'messe',
    datum: String(m.at ?? '').slice(0, 10) || null,
    kanal: text(m.kanal),
    anlass: text(m.event),
    formular: text(m.herkunft) ?? text(m.formular),
    erfasst_von: text(m.by),
  }
}

/**
 * @param {Kontext} k
 */
export async function importiereKunden(k) {
  const quellen = quellenProKunde(k)
  const kontakte = [...quellen.entries()].map(([nr, q]) => ({
    sammlung: 'kundennummern',
    schluessel: String(nr),
    zeile: { alt_id: `kunde:${nr}`, ...baueKontakt(nr, q) },
  }))
  const ids = await k.schreiber.schreibe('kontakte', kontakte)
  for (const nr of quellen.keys()) k.ids.kontakte.set(nr, /** @type {string} */ (ids.get(`kunde:${nr}`)))

  // Objekte: pro Kunde jede verschiedene Adresse einmal. Gebäudeangaben kommen aus dem Lead.
  /** @type {Map<string, any>} */
  const objekte = new Map()
  for (const [nr, liste] of quellen) {
    for (const { art, datensatz: d } of liste) {
      if (art === 'ordner' || !(text(d.street) || text(d.plz) || text(d.ort))) continue
      const schluessel = `${nr}|${adressSchluessel({ strasse: d.street, plz: d.plz, ort: d.ort })}`
      const vorher = objekte.get(schluessel)
      const besichtigung = d.besichtigung ?? {}
      objekte.set(schluessel, {
        sammlung: 'adressen',
        schluessel,
        zeile: {
          alt_id: `objekt:${schluessel}`,
          kontakt_id: k.ids.kontakte.get(nr),
          strasse: vorher?.zeile.strasse ?? text(d.street),
          plz: vorher?.zeile.plz ?? text(d.plz),
          ort: vorher?.zeile.ort ?? text(d.ort),
          gebaeudeart: vorher?.zeile.gebaeudeart ?? k.zuordner.locker('gebaeudeart', d.obj),
          dachform: vorher?.zeile.dachform ?? k.zuordner.locker('dachform', d.dach),
          eigentum: vorher?.zeile.eigentum ?? k.zuordner.locker('eigentum', d.eigen),
          dach: { ...(vorher?.zeile.dach ?? {}), ...besichtigung },
          breite: vorher?.zeile.breite ?? (typeof d.lat === 'number' ? d.lat : null),
          laenge: vorher?.zeile.laenge ?? (typeof d.lon === 'number' ? d.lon : null),
        },
      })
    }
  }
  const oIds = await k.schreiber.schreibe('objekte', [...objekte.values()])
  for (const s of objekte.keys()) k.ids.objekte.set(s, /** @type {string} */ (oIds.get(`objekt:${s}`)))
}

/**
 * Objekt-id zu einem Datensatz mit Adresse (Lead oder Offerte).
 * @param {Kontext} k
 * @param {Record<string, any>} d
 * @returns {string | null}
 */
export function objektVon(k, d) {
  if (!(text(d.street) || text(d.plz) || text(d.ort))) return null
  return (
    k.ids.objekte.get(`${Number(d.kundenNr)}|${adressSchluessel({ strasse: d.street, plz: d.plz, ort: d.ort })}`) ??
    null
  )
}
