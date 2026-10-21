// Schritt 6: Dateien. Die 90 Dateien aus blobs/ kommen in den privaten Speicher «dokumente»;
// Verweise auf SharePoint (sp.files, kbfiles, kbfolders) bleiben Verweise, die Datei bleibt in SharePoint.

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
    const lead = t.parentKind === 'lead' ? k.ids.verkaufschancen.get(String(t.parentId)) : null
    merke(t.file.id, {
      tabelle: lead ? 'verkaufschancen' : 'papierkorb',
      id: lead ?? null,
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

  const intern = k.daten.blobs.map((b) => {
    const bezug = bezuege.get(b.id)
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

  await importiereSharePoint(k)
}

/**
 * SharePoint-Verweise aus Leads, Offerten, kbfiles und kbfolders.
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
          sharepoint_url: text(f.uri),
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

  const kunde = (/** @type {unknown} */ key) => k.ids.kontakte.get(Number(String(key ?? '').slice(1))) ?? null
  await k.schreiber.schreibe(
    'dokumente',
    Object.entries(k.sammlung('kbfiles')).map(([id, f]) => ({
      sammlung: 'kbfiles',
      schluessel: id,
      zeile: {
        alt_id: `kbfile:${id}`,
        name: text(f.name) ?? text(f.file) ?? id,
        bytes: f.bytes ?? null,
        ordner: text(f.folder),
        speicher: 'sharepoint',
        sharepoint_url: text(f.url),
        sharepoint_status: {
          ok: f.ok ?? null,
          fehler: f.err ?? null,
          zu_gross: f.tooBig ?? null,
          verkleinert: f.shrunk ?? null,
        },
        bezug_tabelle: 'kontakte',
        bezug_id: kunde(f.key),
        hochgeladen_von: text(f.by),
        hochgeladen_am: zuZeitstempel(f.at),
        alt_daten: f,
      },
    })),
  )
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
