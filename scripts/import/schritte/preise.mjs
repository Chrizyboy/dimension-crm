// Schritt 2: Lieferanten, Preisliste (preisartikel), Lieferantenpreise und Preisvorlagen.

import { text, zuDatum, zuGanzzahl, zuRappen, zuZahl, zuZeitstempel } from '../umwandeln.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */

/**
 * Legt fehlende Lieferanten an (Namen aus der Preisliste), ohne die vorhandenen zu verdoppeln.
 * @param {Kontext} k
 * @param {string[]} namen
 */
async function sichereLieferanten(k, namen) {
  const fehlend = [...new Set(namen)].filter((n) => !k.ids.lieferanten.has(n.toLowerCase()))
  if (fehlend.length === 0) return
  const { data, error } = await k.db
    .from('lieferanten')
    .insert(fehlend.map((name) => ({ name })))
    .select('id, name')
  if (error) throw new Error(`lieferanten: ${error.message}`)
  for (const l of data ?? []) k.ids.lieferanten.set(l.name.toLowerCase(), l.id)
}

/**
 * @param {Kontext} k
 */
export async function importierePreise(k) {
  const artikel = k.sammlung('preisartikel')
  await sichereLieferanten(
    k,
    Object.values(artikel).flatMap((a) => [
      ...(a.lief ?? []).map((/** @type {any} */ l) => String(l.n)),
      ...(text(a.liefBest) ? [String(a.liefBest)] : []),
    ]),
  )
  const lieferant = (/** @type {unknown} */ name) => {
    const n = text(name)
    return n ? (k.ids.lieferanten.get(n.toLowerCase()) ?? null) : null
  }

  const zeilen = Object.entries(artikel).map(([id, a]) => ({
    sammlung: 'preisartikel',
    schluessel: id,
    zeile: {
      alt_id: `preisartikel:${id}`,
      artikelnummer: text(a.artnr),
      name: text(a.name) ?? id,
      kategorie: k.zuordner.streng('artikelkategorie', a.kat, `preisartikel/${id}`, 'dienstleistungen'),
      hersteller_gruppe: text(a.gruppe),
      einheit: text(a.einheit) ?? 'Stk',
      leistung_w: zuGanzzahl(a.wp),
      verkauf_rappen: zuRappen(a.brutto),
      marge: zuZahl(a.marge),
      rabatt: zuZahl(a.rabatt),
      skonto: zuZahl(a.skonto),
      bevorzugter_lieferant_id: lieferant(a.liefBest),
      gewicht_kg: zuZahl(a.gewicht),
      masse: text(a.masse),
      masse_art: text(a.masseArt),
      masse_quelle:
        a.masseQuelle || a.masseHinweis ? { quelle: a.masseQuelle ?? null, hinweis: a.masseHinweis ?? null } : null,
      datenblaetter: a.dbl ?? {},
      quelle: text(a.quelle),
      archiviert_am: a.archiviert ? (zuZeitstempel(a.archiviertAm) ?? new Date().toISOString()) : null,
      archiviert_von: text(a.archiviertVon),
      archiv_grund: text(a.archivGrund),
      erstellt_am: zuZeitstempel(a.createdAt) ?? k.daten.at,
      alt_daten: a,
    },
  }))
  const ids = await k.schreiber.schreibe('artikel', zeilen)
  for (const [id] of Object.entries(artikel))
    k.ids.artikel.set(id, /** @type {string} */ (ids.get(`preisartikel:${id}`)))

  // Nachfolger erst jetzt, wenn alle Artikel eine id haben.
  for (const [id, a] of Object.entries(artikel)) {
    const nachfolger = text(a.nachfolgerId)
    if (!nachfolger || !k.ids.artikel.has(nachfolger)) continue
    const { error } = await k.db
      .from('artikel')
      .update({ nachfolger_id: k.ids.artikel.get(nachfolger) })
      .eq('id', k.ids.artikel.get(id))
    if (error) throw new Error(`artikel nachfolger: ${error.message}`)
  }

  // Einkaufspreise: jeder Lieferant aus «lief», sonst der EK des Artikels (Lieferant ggf. leer).
  const preise = Object.entries(artikel).flatMap(([id, a]) => {
    /** @type {any[]} */
    const lief = a.lief ?? []
    const liste = lief.length > 0 ? lief : zuRappen(a.ek) !== null ? [{ n: a.liefBest, ek: a.ek, artnr: a.artnr }] : []
    return liste.map((l) => ({
      sammlung: 'preisartikel',
      schluessel: id,
      zeile: {
        alt_id: `preisartikel:${id}:lief:${text(l.n) ?? 'ohne'}`,
        artikel_id: k.ids.artikel.get(id),
        lieferant_id: lieferant(l.n),
        artikelnummer: text(l.artnr),
        ek_rappen: zuRappen(l.ek),
        stand: zuDatum(l.stand),
      },
    }))
  })
  await k.schreiber.schreibe('lieferantenpreise', preise)

  const vorlagen = k.sammlung('preisvorlagen')
  const vIds = await k.schreiber.schreibe(
    'preisvorlagen',
    Object.entries(vorlagen).map(([id, v]) => ({
      sammlung: 'preisvorlagen',
      schluessel: id,
      zeile: {
        alt_id: `preisvorlage:${id}`,
        name: text(v.name) ?? id,
        system: text(v.system),
        quelle: text(v.quelle),
        alt_daten: v,
      },
    })),
  )
  const positionen = Object.entries(vorlagen).flatMap(([id, v]) =>
    (v.pos ?? [])
      .map((/** @type {any} */ p, /** @type {number} */ i) => {
        const artikelId = k.ids.artikel.get(p.aid)
        if (!artikelId) k.hinweis(`Preisvorlage ${id}: Artikel ${p.aid} fehlt in der Preisliste`)
        return { p, i, artikelId }
      })
      .filter((/** @type {any} */ x) => x.artikelId)
      .map((/** @type {any} */ { p, i, artikelId }) => ({
        sammlung: 'preisvorlagen',
        schluessel: id,
        zeile: {
          alt_id: `preisvorlage:${id}:${i}`,
          preisvorlage_id: vIds.get(`preisvorlage:${id}`),
          artikel_id: artikelId,
          menge: zuZahl(p.menge) ?? 0,
          reihenfolge: i,
        },
      })),
  )
  await k.schreiber.schreibe('preisvorlage_positionen', positionen)
}
