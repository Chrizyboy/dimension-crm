// Schritt 8: Handbuch, Social Media, Einstellungen, altes Protokoll und die Sammlungen,
// die im Export vom 21.10.2026 leer sind. Diese werden trotzdem zugeordnet, weil der Import
// beim Umzug (Phase 16) nochmals läuft und dann Daten enthalten kann.

import { text, zuDatum, zuGanzzahl, zuRappen, zuZeitstempel } from '../umwandeln.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */

/**
 * Einfache Zuordnung: jede Zeile mit Kernfeldern und dem vollständigen alten Datensatz.
 * @param {Kontext} k
 * @param {string} sammlung
 * @param {string} tabelle
 * @param {(d: Record<string, any>, id: string) => Record<string, unknown>} felder
 */
async function einfach(k, sammlung, tabelle, felder) {
  return k.schreiber.schreibe(
    tabelle,
    Object.entries(k.sammlung(sammlung)).map(([id, d]) => ({
      sammlung,
      schluessel: id,
      zeile: {
        alt_id: `${sammlung}:${id}`,
        ...felder(d, id),
        erstellt_am: zuZeitstempel(d.createdAt ?? d.at) ?? k.daten.at,
        alt_daten: d,
      },
    })),
  )
}

/**
 * @param {Kontext} k
 */
export async function importiereUebrige(k) {
  const dok = (/** @type {any} */ f) => k.ids.dokumente.get(String(f?.id)) ?? null
  const handbuch = [
    ...Object.entries(k.sammlung('prozesse')).map(([id, p]) => ({
      sammlung: 'prozesse',
      schluessel: id,
      zeile: {
        alt_id: `prozesse:${id}`,
        art: 'prozess',
        titel_de: text(p.titel) ?? id,
        titel_fr: text(p.titel_fr),
        beschreibung_de: text(p.beschreibung),
        beschreibung_fr: text(p.beschreibung_fr),
        version: text(p.version),
        datum: zuDatum(p.datum),
        datei_de_id: dok(p.datei),
        datei_fr_id: dok(p.datei_fr),
        versionen: p.versionen ?? [],
        alt_daten: p,
      },
    })),
    ...Object.entries(k.sammlung('videos')).map(([id, v]) => ({
      sammlung: 'videos',
      schluessel: id,
      zeile: {
        alt_id: `videos:${id}`,
        art: 'video',
        titel_de: text(v.titel) ?? id,
        titel_fr: text(v.titel_fr),
        beschreibung_de: text(v.beschreibung),
        beschreibung_fr: text(v.beschreibung_fr),
        dauer_s: zuGanzzahl(v.dauer),
        reihenfolge: zuGanzzahl(v.reihenfolge),
        datei_de_id: dok(v.datei),
        vorschaubild_id: dok(v.poster),
        alt_daten: v,
      },
    })),
  ]
  const hIds = await k.schreiber.schreibe('handbuch_eintraege', handbuch)
  await k.verknuepfeDokumente(
    'handbuch_eintraege',
    handbuch.flatMap((h) => {
      const z = /** @type {Record<string, unknown>} */ (h.zeile)
      return [z.datei_de_id, z.datei_fr_id, z.vorschaubild_id].map((d) => [d, hIds.get(h.zeile.alt_id)])
    }),
  )

  const sIds = await einfach(k, 'socialposts', 'social_posts', (s) => ({
    thema: text(s.thema),
    idee: text(s.topic),
    datum: zuDatum(s.date),
    zeit: text(s.time),
    netzwerke: s.nets ?? [],
    format: text(s.fmt),
    sprache: text(s.lang),
    texte: s.texts ?? {},
    bilder: s.imgs ?? [],
    status: text(s.status) ?? 'entwurf',
    verfasst_von: text(s.by),
    details: {
      quelle: s.src ?? null,
      ki_bild: s.aiImg ?? null,
      text_runden: s.textRound ?? null,
      bild_runden: s.imgRound ?? null,
    },
  }))
  await k.verknuepfeDokumente(
    'social_posts',
    Object.entries(k.sammlung('socialposts')).flatMap(([id, s]) =>
      (s.imgs ?? []).map((/** @type {any} */ b) => [dok(b), sIds.get(`socialposts:${id}`)]),
    ),
  )

  await einfach(k, 'meta', 'einstellungen', (_d, id) => ({ schluessel: `vorlage.${id}`, wert: _d }))

  // Altes Protokoll: ein Dokument pro Person und Tag mit vielen Einträgen → ein Eintrag pro Änderung.
  await k.schreiber.schreibe(
    'altes_protokoll',
    Object.entries(k.sammlung('audit')).flatMap(([tag, a]) =>
      Object.entries(a.e ?? {}).map(([id, e]) => ({
        sammlung: 'audit',
        schluessel: tag,
        zeile: {
          alt_id: `audit:${tag}:${id}`,
          zeitpunkt: zuZeitstempel(e.at) ?? zuZeitstempel(a.day),
          person: text(e.user) ?? text(a.user),
          sammlung: text(e.col),
          datensatz: text(e.doc),
          aktion: text(e.act),
          aenderungen: e.ch ?? [],
          alt_daten: e,
        },
      })),
    ),
  )

  // Im Export leer; Zuordnung für spätere Läufe.
  await einfach(k, 'outbox', 'ausgangskorb', (o) => ({
    an: text(o.to) ?? '',
    betreff: text(o.subject),
    html: text(o.html),
    text: text(o.text),
    status: text(o.status) ?? 'wartet',
    gesendet_am: zuZeitstempel(o.sentAt),
    bezug_tabelle: o.leadId ? 'verkaufschancen' : null,
    bezug_id: k.ids.verkaufschancen.get(String(o.leadId)) ?? null,
  }))
  await einfach(k, 'aistil', 'schreibstile', (s, id) => ({
    person_id: k.person(id),
    regeln: s.regeln ?? s.rules ?? [],
    beispiele: s.beispiele ?? s.examples ?? [],
  }))
  await einfach(k, 'signatures', 'signaturen', (s, id) => ({ person_id: k.person(id), html: text(s.text) ?? '' }))
  await einfach(k, 'campaigns', 'kampagnen', (c) => ({
    art: text(c.type) ?? 'serienmail',
    betreff: text(c.subject),
    anzahl: zuGanzzahl(c.count),
    versendet_am: zuZeitstempel(c.at),
    versendet_von: text(c.by),
  }))
  await einfach(k, 'newsletter', 'newsletter', (n, id) => ({
    thema: text(n.thema) ?? id,
    segment: n.segment ?? null,
    text_de: text(n.text_de ?? n.textDe),
    text_fr: text(n.text_fr ?? n.textFr),
    status: text(n.status) ?? 'entwurf',
  }))
  await einfach(k, 'nlkontakte', 'newsletter_empfaenger', (n) => ({
    email: text(n.email) ?? '',
    name: text(n.name),
    einwilligung: n.einwilligung ?? null,
    gesperrt: n.sperre === true,
  }))
  await einfach(k, 'tasks', 'aufgaben', (t, id) => ({
    titel: text(t.title) ?? id,
    faellig_am: zuDatum(t.due),
    person_id: k.person(t.person),
    erledigt_am: t.done ? (zuZeitstempel(t.doneAt) ?? new Date().toISOString()) : null,
    erledigt_von: k.person(t.doneBy),
  }))
  await einfach(k, 'tickets', 'rueckmeldungen', (t) => ({
    text: text(t.text) ?? '',
    status: text(t.status) ?? 'neu',
    antwort: text(t.antwort),
    antwort_von: text(t.antwortVon),
  }))
  await einfach(k, 'kalkulationen', 'kalkulationen', (c) => ({
    offerte_id: k.ids.offerten.get(String(c.projectId)) ?? null,
    titel: text(c.titel),
    rabatt: c.rabatt ?? null,
    notiz: text(c.notiz),
    positionen: c.pos ?? [],
    leistung_kwp: c.kwp ?? null,
    netto_rappen: zuRappen(c.netto),
    total_rappen: zuRappen(c.total),
  }))
  await einfach(k, 'cases', 'service_faelle', (c, id) => ({
    nummer: text(c.nr) ?? id,
    titel: text(c.titel) ?? id,
    kategorie: text(c.kat),
    prioritaet: text(c.prio),
    status: text(c.status) ?? 'neu',
    person_id: k.person(c.person),
    garantie: c.garantie ?? null,
    beschreibung: text(c.beschreibung),
    verlauf: c.verlauf ?? [],
    erledigt_am: zuDatum(c.erledigtAm),
  }))
  await einfach(k, 'wartung', 'wartungsvertraege', (w) => ({
    kontakt_id: k.ids.kontakte.get(Number(w.kundenNr)),
    offerte_id: k.ids.offerten.get(String(w.projectId)) ?? null,
    leistungen: w.leistungen ?? [],
    preis_rappen: zuRappen(w.preis),
    letzte_wartung: zuDatum(w.letzte),
    naechste_wartung: zuDatum(w.naechste),
    verlauf: w.verlauf ?? [],
  }))
}
