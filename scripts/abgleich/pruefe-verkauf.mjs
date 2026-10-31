// Feld-für-Feld-Abgleich von Leads, Kontakten, Offerten, Projekten und Werkverträgen.
// Erwartet wird immer, was V233 dem Benutzer angezeigt hat (siehe v233.mjs), nicht was der Import tut.

import { leadEntryDate, leadStandort, numVal, offerPerson, offerStandort, rappenWieV233, WON } from '../import/v233.mjs'
import { nullWieNull, ortszeit } from './vergleich.mjs'
import { festeQuelle, istMesseOhneWunsch, werkvertragBetrag } from '../import/entscheide.mjs'

/** V233-Status eines Leads → Stufe im neuen CRM (unabhängig von der Tabelle auswahlwerte aufgeschrieben). */
const STUFE = {
  Neu: 'neu',
  Offen: 'offen',
  Warten: 'warten',
  'Termin vereinbart': 'termin_vereinbart',
  'zur Offerte': 'zur_offerte',
  Abgeschlossen: 'abgeschlossen',
  'Kunde kein Interesse': 'kein_interesse',
}
/** V233 statusKey einer Offerte → Offertstatus. */
const OFFERTSTATUS = {
  '': 'in_arbeit',
  todo: 'in_arbeit',
  sent: 'offeriert',
  closed: 'angenommen',
  construction: 'angenommen',
  done: 'angenommen',
  lost: 'verloren',
  archived: 'archiviert',
}
const PROJEKTSTATUS = { closed: 'auftrag', construction: 'im_bau', done: 'abgeschlossen' }

/** @param {unknown} v */
const t = (v) => (v === null || v === undefined ? '' : String(v).trim())
/** Vorname einer Person («Loris Pisciotta» → «Loris»). @param {Record<string, any> | undefined} p */
const vorname = (p) => (p ? String(p.name).split(' ')[0] : null)

/**
 * @param {import('./vergleich.mjs').Befunde} b
 * @param {{ leads: Record<string, any>[], projects: Record<string, any>[], mwst: number }} alt
 * @param {import('./laden.mjs').Neu} neu
 */
export function pruefeVerkauf(b, alt, neu) {
  const kontakt = (/** @type {string} */ id) => neu.nachId.kontakte.get(id)
  const objekt = (/** @type {string} */ id) => neu.nachId.objekte.get(id)
  const standort = (/** @type {string} */ id) => neu.nachId.standorte.get(id)?.name ?? null
  const person = (/** @type {string} */ id) => vorname(neu.nachId.personen.get(id))

  // Kontakte: jede Kundennummer aus Leads und Offerten muss als Kontakt da sein.
  const nummern = new Set([...alt.leads, ...alt.projects].map((d) => Number(d.kundenNr)).filter((n) => n > 0))
  const kontakteNachNr = new Map(neu.tabellen.kontakte.map((k) => [k.kundennummer, k]))
  for (const nr of nummern)
    b.vergleiche('Kontakte', `K${String(nr).padStart(4, '0')}`, 'vorhanden', true, kontakteNachNr.has(nr))

  for (const l of alt.leads) {
    const n = neu.nachAltId.verkaufschancen.get(`lead:${l.id}`)
    const nr = l.id
    if (istMesseOhneWunsch(l)) {
      // Entscheid 13/15B: nur Kontakt, kein (sichtbarer) Lead.
      b.vergleiche('Leads', nr, 'nur Kontakt (Messe ohne Beratungswunsch)', true, !n || !!n.geloescht_am)
      continue
    }
    if (!b.vergleiche('Leads', nr, 'vorhanden', true, !!n)) continue
    const v = /** @type {Record<string, any>} */ (n)
    const quelle = festeQuelle(l)
    if (quelle) b.vergleiche('Leads', nr, 'Quelle', quelle, v.quelle, { grund: 'Ausschreibung (Monitor) oder Messe' })
    b.vergleiche('Leads', nr, 'Nummer', l.id, v.nummer)
    b.vergleiche('Leads', nr, 'Stand', STUFE[/** @type {keyof typeof STUFE} */ (l.status)] ?? l.status, v.stufe)
    b.vergleiche('Leads', nr, 'im Papierkorb', !!l._papierkorb, !!v.geloescht_am)
    b.vergleiche('Leads', nr, 'Eingang', leadEntryDate(l), v.eingang_am)
    b.vergleiche('Leads', nr, 'Standort', leadStandort(l), standort(v.standort_id))
    b.vergleiche('Leads', nr, 'Verkäufer (Tour)', t(l.tourPerson), person(v.tour_person_id))
    const termin = ortszeit(v.termin_am)
    b.vergleiche('Leads', nr, 'Termin Datum', l.tDate, termin.datum)
    if (l.tDate) b.vergleiche('Leads', nr, 'Termin Zeit', t(l.tTime) || '00:00', termin.zeit)
    b.vergleiche('Leads', nr, 'Wiedervorlage', l.wvDatum, v.wiedervorlage_am)
    b.vergleiche('Leads', nr, 'Wiedervorlage Grund', l.wvGrund, v.wiedervorlage_grund)
    b.vergleiche('Leads', nr, 'Grund kein Interesse', l.keinGrund, v.verlustgrund)
    b.vergleiche('Leads', nr, 'Kommentar Kunde', l.comment, v.kommentar_kunde)
    b.vergleiche('Leads', nr, 'Notiz', l.note, v.notiz_intern)
    b.vergleiche('Leads', nr, 'Zuständig', l.zu, v.zustaendig)
    const k = kontakt(v.kontakt_id)
    b.vergleiche('Leads', nr, 'Kundennummer', Number(l.kundenNr) || null, k?.kundennummer ?? null)
    const o = objekt(v.objekt_id)
    b.vergleiche('Leads', nr, 'Strasse', l.street, o?.strasse)
    b.vergleiche('Leads', nr, 'PLZ', l.plz, o?.plz)
    b.vergleiche('Leads', nr, 'Ort', l.ort, o?.ort)
    // Kontaktangaben: der Kontakt hält nur eine Mail und ein Telefon. Andere Werte aus älteren Leads
    // bleiben im Lead (alt_daten) erhalten, sind aber nicht mehr sichtbar.
    if (t(l.mail) && t(l.mail).toLowerCase() !== t(k?.email).toLowerCase())
      b.melde({
        bereich: 'Leads',
        datensatz: nr,
        feld: 'E-Mail (Kontakt)',
        alt: l.mail,
        neu: k?.email ?? null,
        art: 'hinweis',
        grund: 'Kontakt hat eine andere E-Mail aus einem neueren Datensatz',
      })
    if (t(l.tel) && t(l.tel).replace(/\D/g, '') !== t(k?.telefon).replace(/\D/g, ''))
      b.melde({
        bereich: 'Leads',
        datensatz: nr,
        feld: 'Telefon (Kontakt)',
        alt: l.tel,
        neu: k?.telefon ?? null,
        art: 'hinweis',
        grund: 'Kontakt hat ein anderes Telefon aus einem neueren Datensatz',
      })
    const ln = l.vorname != null || l.nachname != null ? `${t(l.vorname)} ${t(l.nachname)}` : t(l.name)
    if (ln.trim() && !gleicherName(ln, k))
      b.melde({
        bereich: 'Leads',
        datensatz: nr,
        feld: 'Name (Kontakt)',
        alt: ln.trim(),
        neu: kontaktName(k),
        art: 'hinweis',
        grund: 'Kontakt trägt den Namen aus einem neueren Datensatz derselben Kundennummer',
      })
    if (l.messe?.einwilligung === true)
      b.vergleiche('Leads', nr, 'Einwilligung Werbung (Messe)', true, !!k?.einwilligung?.datum, {
        grund: 'Messe-Formular mit Einwilligung',
      })
    if (l.keineWerbung === true) b.vergleiche('Leads', nr, 'Werbesperre', true, k?.werbesperre)
  }

  for (const p of alt.projects) {
    const nr = String(p.nr ?? p.id)
    const o = neu.nachAltId.offerten.get(`project:${p.id}`)
    if (!b.vergleiche('Offerten', nr, 'vorhanden', true, !!o)) continue
    const x = /** @type {Record<string, any>} */ (o)
    b.vergleiche(
      'Offerten',
      nr,
      'Status',
      OFFERTSTATUS[/** @type {keyof typeof OFFERTSTATUS} */ (t(p.statusKey))] ?? p.statusKey,
      x.status,
    )
    b.vergleiche('Offerten', nr, 'Angebot vom', p.angebotAm, x.angebot_am)
    b.vergleiche(
      'Offerten',
      nr,
      'Angebotswert (Rappen, exkl.)',
      nullWieNull(rappenWieV233(p.angebotswert)),
      nullWieNull(x.betrag_rappen),
    )
    b.vergleiche('Offerten', nr, 'Leistung kWp', nullWieNull(numVal(p.leistung)), nullWieNull(x.leistung_kwp))
    b.vergleiche(
      'Offerten',
      nr,
      'Anzahl Module',
      nullWieNull(anzahlModule(p.anzahlModule)),
      nullWieNull(x.anzahl_module),
    )
    b.vergleiche('Offerten', nr, 'Standort', offerStandort(p), standort(x.standort_id))
    b.vergleiche('Offerten', nr, 'Verantwortlich', offerPerson(p, alt.leads), person(x.verantwortlich_id))
    b.vergleiche('Offerten', nr, 'Sprache', p.lang === 'fr' ? 'fr' : 'de', x.sprache)
    b.vergleiche('Offerten', nr, 'Titel', p.projektname, x.titel)
    b.vergleiche('Offerten', nr, 'Entscheid', p.entscheid, x.entscheid)
    b.vergleiche('Offerten', nr, 'Entscheid am', p.entscheidAm, x.entscheid_am)
    b.vergleiche('Offerten', nr, 'Nachfassen am', p.nachfolgeTermin, x.nachfassen_am)
    b.vergleiche('Offerten', nr, 'Wechselrichter', p.wechselrichter, x.wechselrichter)
    b.vergleiche('Offerten', nr, 'Batterie', p.batterie, x.batterie)
    b.vergleiche(
      'Offerten',
      nr,
      'Lead',
      t(p.leadId) || null,
      neu.nachId.verkaufschancen.get(x.verkaufschance_id)?.nummer ?? null,
    )
    const k = kontakt(x.kontakt_id)
    b.vergleiche('Offerten', nr, 'Kundennummer', Number(p.kundenNr) || null, k?.kundennummer ?? null)
    const pn = `${t(p.vornameMO)} ${t(p.nameMO)}`.trim() || t(p.projektname)
    if (pn && !gleicherName(pn, k))
      b.melde({
        bereich: 'Offerten',
        datensatz: nr,
        feld: 'Name (Kontakt)',
        alt: pn,
        neu: kontaktName(k),
        art: 'hinweis',
        grund: 'Kontakt trägt den Namen aus einem neueren Datensatz derselben Kundennummer',
      })
    const ob = objekt(x.objekt_id)
    b.vergleiche('Offerten', nr, 'Strasse', p.street, ob?.strasse)
    b.vergleiche('Offerten', nr, 'Ort', p.ort, ob?.ort)

    // Wie der Import: ein Unterschriftsdatum allein zählt nicht, wenn die Ablage den Stand zurückgesetzt hat.
    const auftrag = WON.includes(p.statusKey) || (!!t(p.unterzeichnetAm) && p._statusVorlage === undefined)
    // Im Papierkorb (z. B. nach der Ablage-Korrektur nicht mehr gewonnen) zählt als nicht vorhanden.
    const prAlle = neu.nachAltId.projekte.get(`project:${p.id}`)
    const pr = prAlle?.geloescht_am ? undefined : prAlle
    if (!b.vergleiche('Projekte', nr, 'vorhanden', auftrag, !!pr)) continue
    if (!pr) continue
    b.vergleiche(
      'Projekte',
      nr,
      'Status',
      PROJEKTSTATUS[/** @type {keyof typeof PROJEKTSTATUS} */ (p.statusKey)] ?? 'auftrag',
      pr.status,
    )
    b.vergleiche(
      'Projekte',
      nr,
      'Vertragswert (Rappen, inkl.)',
      nullWieNull(rappenWieV233(p.vertragswert)),
      nullWieNull(pr.vertragswert_rappen),
    )
    b.vergleiche('Projekte', nr, 'Unterzeichnet am', p.unterzeichnetAm, pr.unterzeichnet_am)
    b.vergleiche('Projekte', nr, 'Baubeginn', p.baubeginn, pr.baubeginn)
    b.vergleiche('Projekte', nr, 'Standort', t(p.standort) || offerStandort(p), standort(pr.standort_id))
    b.vergleiche('Projekte', nr, 'Verantwortlich', offerPerson(p, alt.leads), person(pr.verantwortlich_id))
    b.vergleiche('Projekte', nr, 'Baustatus', p.bauStatus, pr.bau_status)
    b.vergleiche('Projekte', nr, 'Werktage', p.anzahlWerktage, pr.werktage)
    b.vergleiche('Projekte', nr, 'Architekt', p.architekt, pr.architekt)
    b.vergleiche('Projekte', nr, 'Elektriker', p.elektriker, pr.elektriker)
    const plan = (Array.isArray(p.plan) ? p.plan : []).filter((/** @type {any} */ e) => t(e.von))
    b.vergleiche(
      'Projekte',
      nr,
      'Einsätze',
      plan.length,
      neu.tabellen.einsaetze.filter((e) => e.projekt_id === pr.id).length,
    )
  }

  for (const p of alt.projects) {
    const wv = neu.nachAltId.werkvertraege.get(`project:${p.id}:werkvertrag`)
    if (!wv) continue
    const nr = String(p.nr ?? p.id)
    // Entscheid 11B: Vertragswert, sonst Angebotswert plus MWST (V233 zeigte ihn exkl.).
    const soll = werkvertragBetrag(p, alt.mwst)
    b.vergleiche('Werkverträge', nr, 'Betrag (Rappen)', nullWieNull(soll.betrag), nullWieNull(wv.betrag_rappen), {
      grund: soll.mwstErgaenzt ? `ohne Vertragswert: Angebot plus ${alt.mwst} % MWST` : undefined,
    })
    b.vergleiche('Werkverträge', nr, 'Unterschrieben am', p.unterzeichnetAm, wv.unterschrieben_am)
    b.vergleiche(
      'Werkverträge',
      nr,
      'Standort-Firma',
      t(p.standort) || offerStandort(p),
      neu.nachId.firmen.get(wv.firma_id)?.kuerzel === 'sarl'
        ? 'Bulle'
        : neu.nachId.firmen.get(wv.firma_id)?.kuerzel === 'gmbh'
          ? 'Muri'
          : null,
    )
  }
}

/** @param {Record<string, any> | undefined} k */
const kontaktName = (k) => (k ? [k.firma, k.vorname, k.nachname].filter(Boolean).join(' ') : null)
/** Gleicher Name, egal in welcher Reihenfolge und Schreibung. @param {string} name @param {Record<string, any> | undefined} k */
function gleicherName(name, k) {
  const teile = (/** @type {string | null} */ s) =>
    (s ?? '').toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ')
  const n = teile(name)
  return (
    n === teile([k?.vorname, k?.nachname].filter(Boolean).join(' ')) ||
    n === teile(k?.firma ?? '') ||
    n === teile(kontaktName(k))
  )
}

/**
 * Anzahl Module wie gemeint: «24+3» sind 27 Module (V233 rechnete mit 24, zeigte aber «24+3»).
 * @param {unknown} v
 * @returns {number | null}
 */
export function anzahlModule(v) {
  const s = t(v)
  if (!s) return null
  if (/^\d+(\s*\+\s*\d+)+$/.test(s)) return s.split('+').reduce((a, x) => a + Number(x), 0)
  const n = numVal(s)
  return n ? Math.round(n) : null
}
