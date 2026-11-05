// Schritt 6: Dateien. Die 90 Dateien aus blobs/ kommen in den privaten Speicher «dokumente»;
// Verweise auf SharePoint (sp.files, kbfolders) bleiben Verweise, die Datei bleibt in SharePoint.
// kbfiles (Kunden-Backup) ist die SharePoint-Kopie einer Datei aus blobs/ (gleiche id): kein eigenes
// Dokument, sonst stünde jede Datei doppelt beim Kunden (Migration 20261117130511).

import { text, zuZeitstempel } from '../umwandeln.mjs'
import { alleLeads } from './kunden.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */
/** @typedef {{ tabelle: string, id: string | null, ordner?: string | null, von?: string | null, am?: string | null, geloescht?: string | null }} Bezug */

/**
 * Wer verweist auf welche Datei? Ergebnis: Datei-id → Bezug (der erste gefundene gewinnt).
 * Spesen, Handbuch und Social Posts entstehen erst nach den Dokumenten. Bei einem wiederholten Lauf
 * sind ihre ids schon bekannt; so bleibt der Bezug stabil und das Protokoll ohne leere Änderungen.
 * @param {Kontext} k
 * @param {Map<string, string>} spaeter alt_id → id aus einem früheren Lauf
 * @returns {Map<string, Bezug>}
 */
function dateiBezuege(k, spaeter) {
  /** @type {Map<string, Bezug>} */
  const karte = new Map()
  const merke = (/** @type {unknown} */ id, /** @type {Bezug} */ b) => {
    const t = text(id)
    if (t && !karte.has(t)) karte.set(t, b)
  }
  const datei = (/** @type {any} */ f, /** @type {string} */ tabelle, /** @type {string | null} */ id) =>
    merke(f?.id, { tabelle, id, ordner: text(f?.folder), von: text(f?.by), am: zuZeitstempel(f?.uploadedAt ?? f?.at) })
  for (const { nummer, lead } of alleLeads(k)) {
    for (const f of lead.files ?? []) datei(f, 'verkaufschancen', k.ids.verkaufschancen.get(nummer) ?? null)
    if (lead.luftbild)
      datei({ ...lead.luftbild, folder: 'luftbild' }, 'verkaufschancen', k.ids.verkaufschancen.get(nummer) ?? null)
  }
  for (const [id, p] of Object.entries(k.sammlung('projects')))
    for (const f of p.files ?? []) datei(f, 'offerten', k.ids.offerten.get(id) ?? null)
  for (const t of Object.values(k.sammlung('trash'))) {
    if (t.kind !== 'attachment' || !t.file) continue
    const lead = t.parentKind === 'lead' ? k.ids.verkaufschancen.get(String(t.parentId)) : undefined
    const offerte = t.parentKind === 'project' ? k.ids.offerten.get(String(t.parentId)) : undefined
    merke(t.file.id, {
      tabelle: lead ? 'verkaufschancen' : offerte ? 'offerten' : 'papierkorb',
      id: lead ?? offerte ?? null,
      ordner: text(t.file.folder),
      von: text(t.file.by),
      am: zuZeitstempel(t.file.uploadedAt),
      geloescht: zuZeitstempel(t.deletedAt),
    })
  }
  const frueher = (/** @type {string} */ alt) => spaeter.get(alt) ?? null
  for (const [id, s] of Object.entries(k.sammlung('expenses')))
    datei({ ...s.beleg, folder: 'beleg' }, 'spesen', frueher(`expense:${id}`))
  for (const [id, p] of Object.entries(k.sammlung('prozesse'))) {
    datei({ ...p.datei, folder: 'handbuch' }, 'handbuch_eintraege', frueher(`prozesse:${id}`))
    datei({ ...p.datei_fr, folder: 'handbuch' }, 'handbuch_eintraege', frueher(`prozesse:${id}`))
  }
  for (const [id, v] of Object.entries(k.sammlung('videos'))) {
    datei({ ...v.datei, folder: 'handbuch' }, 'handbuch_eintraege', frueher(`videos:${id}`))
    datei({ ...v.poster, folder: 'handbuch' }, 'handbuch_eintraege', frueher(`videos:${id}`))
  }
  for (const [id, s] of Object.entries(k.sammlung('socialposts')))
    for (const b of s.imgs ?? []) datei({ ...b, folder: 'social' }, 'social_posts', frueher(`socialposts:${id}`))
  return karte
}

/**
 * @param {Kontext} k
 */
export async function importiereDokumente(k) {
  /** @type {Map<string, string>} */
  const spaeter = new Map()
  for (const tabelle of ['spesen', 'handbuch_eintraege', 'social_posts']) {
    const { data, error } = await k.db.from(tabelle).select('id, alt_id').not('alt_id', 'is', null)
    if (error) throw new Error(`${tabelle}: ${error.message}`)
    for (const z of data ?? []) spaeter.set(z.alt_id, z.id)
  }
  const bezuege = dateiBezuege(k, spaeter)
  // Papierkorb-Anhänge, deren Datei nicht im Export ist, bleiben im Papierkorb-Bericht sichtbar.
  for (const [schluessel, t] of Object.entries(k.sammlung('trash')))
    if (t.kind === 'attachment' && !k.daten.blobs.some((b) => b.id === t.file?.id))
      k.hinweis(`Papierkorb ${schluessel}: Datei fehlt im Export`)

  let hochgeladen = 0
  for (const b of k.daten.blobs) {
    const inhalt = k.datei(b.id)
    if (!inhalt) {
      k.hinweis(`Datei ${b.id} (${b.name ?? 'ohne Namen'}) fehlt im Ordner blobs/`)
      continue
    }
    const { error } = await k.db.storage
      .from('dokumente')
      .upload(`vorlage/${b.id}`, inhalt, { contentType: b.contentType ?? 'application/octet-stream', upsert: true })
    if (error) throw new Error(`Speicher ${b.id}: ${error.message}`)
    hochgeladen += 1
  }
  k.bericht.dateienHochgeladen = hochgeladen

  const kbfiles = k.sammlung('kbfiles')
  const intern = k.daten.blobs.map((b) => {
    const kb = kbfiles[b.id]
    const kunde = kb ? kundeAusSchluessel(k, kb.key) : null
    const bezug =
      bezuege.get(b.id) ?? (kunde ? { tabelle: 'kontakte', id: kunde, ordner: text(kb?.folder) } : undefined)
    return {
      sammlung: 'blobs',
      schluessel: b.id,
      zeile: {
        alt_id: `blob:${b.id}`,
        name: text(b.name) ?? b.id,
        mime_typ: text(b.contentType),
        bytes: b.sizeBytes ?? null,
        ordner: bezug?.ordner ?? null,
        speicher: 'intern',
        speicher_pfad: `vorlage/${b.id}`,
        sharepoint_url: kb?.ok ? text(kb.url) : null,
        sharepoint_status: kb ? backupStand(kb) : null,
        bezug_tabelle: bezug?.tabelle ?? null,
        bezug_id: bezug?.id ?? null,
        hochgeladen_von: bezug?.von ?? null,
        hochgeladen_am: bezug?.am ?? null,
        geloescht_am: bezug?.geloescht ?? null,
        alt_daten: b,
      },
    }
  })
  const ids = await k.schreiber.schreibe('dokumente', intern)
  for (const b of k.daten.blobs) k.ids.dokumente.set(b.id, /** @type {string} */ (ids.get(`blob:${b.id}`)))
  for (const [schluessel, t] of Object.entries(k.sammlung('trash'))) {
    const id = t.kind === 'attachment' ? k.ids.dokumente.get(String(t.file?.id)) : undefined
    if (id) k.schreiber.merke('trash', schluessel, 'dokumente', id)
  }
  for (const id of Object.keys(kbfiles)) {
    const dokument = k.ids.dokumente.get(id)
    if (dokument) k.schreiber.merke('kbfiles', id, 'dokumente', dokument)
    else k.hinweis(`Kunden-Backup ${id}: Datei fehlt im Export`)
  }

  await importiereSharePoint(k)
}

/**
 * Kunde zu einem Schlüssel der Vorlage («K0638»).
 * @param {Kontext} k
 * @param {unknown} key
 * @returns {string | null}
 */
function kundeAusSchluessel(k, key) {
  return k.ids.kontakte.get(Number(String(key ?? '').slice(1))) ?? null
}

/**
 * Sicherungsstand aus dem Kunden-Backup der Vorlage.
 * @param {any} f
 */
function backupStand(f) {
  return { ok: f.ok ?? null, fehler: f.err ?? null, zu_gross: f.tooBig ?? null, verkleinert: f.shrunk ?? null }
}

/**
 * Web-Adresse einer Datei in der Bibliothek «Public». V233 speicherte nur die Graph-Adresse
 * (`file:///…`), die kein Browser öffnet. Gleiche Regel wie `intern.public_web_url`.
 * @param {string | null} pfad
 * @returns {string | null}
 */
export function webAdresse(pfad) {
  if (!pfad) return null
  const kodiert = pfad.replaceAll('%', '%25').replaceAll('#', '%23').replaceAll('?', '%3F').replaceAll(' ', '%20')
  return `https://dimensionsolaire.sharepoint.com/sites/Dimension-Solaire/Public/${kodiert}`
}

/**
 * SharePoint-Verweise aus Leads, Offerten und kbfolders.
 * @param {Kontext} k
 */
async function importiereSharePoint(k) {
  const sp = [
    ...alleLeads(k).map(({ nummer, lead, sammlung, schluessel }) => ({
      art: 'lead',
      nr: nummer,
      d: lead,
      sammlung,
      schluessel,
      tabelle: 'verkaufschancen',
      id: k.ids.verkaufschancen.get(nummer) ?? null,
    })),
    ...Object.entries(k.sammlung('projects')).map(([id, p]) => ({
      art: 'project',
      nr: id,
      d: p,
      sammlung: 'projects',
      schluessel: id,
      tabelle: 'offerten',
      id: k.ids.offerten.get(id) ?? null,
    })),
  ].flatMap((q) =>
    (q.d.sp?.files ?? []).map((/** @type {any} */ f) => {
      const vertrag = q.art === 'project' && f.folder === 'werkvertrag' ? k.ids.werkvertraege.get(q.nr) : undefined
      return {
        sammlung: q.sammlung,
        schluessel: q.schluessel,
        zeile: {
          alt_id: `sp:${q.art}:${q.nr}:${f.id}`,
          name: text(f.name) ?? f.id,
          bytes: f.bytes ?? null,
          ordner: text(f.folder),
          speicher: 'sharepoint',
          sharepoint_pfad: text(f.path),
          sharepoint_url: webAdresse(text(f.path)) ?? text(f.uri),
          bezug_tabelle: vertrag ? 'werkvertraege' : q.tabelle,
          bezug_id: vertrag ?? q.id,
          hochgeladen_am: zuZeitstempel(q.d.sp?.syncedAt),
          alt_daten: f,
        },
      }
    }),
  )
  const spIds = await k.schreiber.schreibe('dokumente', sp)

  // Erster Werkvertrag-PDF pro Vertrag wird dessen Dokument.
  for (const e of sp) {
    if (e.zeile.bezug_tabelle !== 'werkvertraege' || !e.zeile.bezug_id || k.ids.vertragsDokument.has(e.zeile.bezug_id))
      continue
    k.ids.vertragsDokument.set(e.zeile.bezug_id, /** @type {string} */ (spIds.get(e.zeile.alt_id)))
  }
  for (const [vertrag, dokument] of k.ids.vertragsDokument) {
    const { error } = await k.db.from('werkvertraege').update({ dokument_id: dokument }).eq('id', vertrag)
    if (error) throw new Error(`werkvertraege dokument: ${error.message}`)
  }

  const kunde = (/** @type {unknown} */ key) => kundeAusSchluessel(k, key)
  await k.schreiber.schreibe(
    'sharepoint_ordner',
    Object.entries(k.sammlung('kbfolders')).map(([key, o]) => ({
      sammlung: 'kbfolders',
      schluessel: key,
      zeile: {
        alt_id: `kbfolder:${key}`,
        kontakt_id: kunde(key),
        name: text(o.name) ?? key,
        ordner_id: text(o.id) ?? key,
        url: text(o.url),
        unterordner: o.subs ?? {},
        alt_daten: o,
      },
    })),
  )
}
