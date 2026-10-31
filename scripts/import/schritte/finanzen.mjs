// Schritt 7: Spesen und Finanzen & Liquidität (finfix, finpay, finmat, finin, finset).

import { text, zuDatum, zuGanzzahl, zuRappen, zuZeitstempel } from '../umwandeln.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */

/**
 * @param {Kontext} k
 */
export async function importiereFinanzen(k) {
  const spesen = Object.entries(k.sammlung('expenses')).map(([id, s]) => ({
    sammlung: 'expenses',
    schluessel: id,
    zeile: {
      alt_id: `expense:${id}`,
      person_id: k.person(s.uid),
      datum: zuDatum(s.datum) ?? zuDatum(s.createdAt),
      betrag_rappen: zuRappen(s.betrag) ?? 0,
      kategorie: text(s.kategorie) ?? 'Sonstiges',
      zweck: text(s.zweck),
      notiz: text(s.notiz),
      beleg_id: k.ids.dokumente.get(String(s.beleg?.id)) ?? null,
      status: text(s.status) ?? 'eingereicht',
      ausbezahlt_am: zuDatum(s.ausbezahltAm),
      ausbezahlt_von: text(s.ausbezahltVon),
      storniert_am: zuDatum(s.stornoAm),
      storniert_von: text(s.stornoVon),
      mail: s.mail ?? null,
      erstellt_am: zuZeitstempel(s.createdAt) ?? k.daten.at,
      alt_daten: s,
    },
  }))
  // Ausbezahlte und stornierte Spesen schützt die Datenbank (finanzen.spesen_fest). Beim zweiten Lauf
  // (Stichtag nach dem Probe-Import) bleiben sie, wie sie sind; nur die Zuordnung alt → neu wird gemerkt.
  const { data: fest, error: festFehler } = await k.db
    .from('spesen')
    .select('id, alt_id')
    .in(
      'alt_id',
      spesen.map((x) => x.zeile.alt_id),
    )
    .in('status', ['ausbezahlt', 'storniert'])
  if (festFehler) throw new Error(`spesen: ${festFehler.message}`)
  const festIds = new Map((fest ?? []).map((f) => [f.alt_id, f.id]))
  for (const x of spesen) {
    const id = festIds.get(x.zeile.alt_id)
    if (id) k.schreiber.merke(x.sammlung, x.schluessel, 'spesen', id)
  }
  const sIds = await k.schreiber.schreibe(
    'spesen',
    spesen.filter((x) => !festIds.has(x.zeile.alt_id)),
  )
  for (const [alt, id] of festIds) sIds.set(alt, id)
  await k.verknuepfeDokumente(
    'spesen',
    spesen.map((s) => [s.zeile.beleg_id, sIds.get(s.zeile.alt_id)]),
  )

  const fixIds = await k.schreiber.schreibe(
    'fixkosten',
    Object.entries(k.sammlung('finfix')).map(([id, f]) => ({
      sammlung: 'finfix',
      schluessel: id,
      zeile: {
        alt_id: `finfix:${id}`,
        bezeichnung: text(f.bezeichnung) ?? id,
        gruppe: text(f.gruppe),
        detail: text(f.detail),
        betrag_rappen: zuRappen(f.betrag) ?? 0,
        rhythmus: text(f.rhythmus) ?? 'monat',
        tag: zuGanzzahl(f.tag),
        start_monat: text(f.startMonat),
        ab: zuDatum(f.ab),
        bis: zuDatum(f.bis),
        standort: text(f.standort),
        aktiv: f.aktiv !== false,
        notiz: text(f.notiz),
        quelle: text(f.quelle),
        alt_daten: f,
      },
    })),
  )

  await k.schreiber.schreibe(
    'kreditor_zahlungen',
    Object.entries(k.sammlung('finpay')).map(([id, z]) => ({
      sammlung: 'finpay',
      schluessel: id,
      zeile: {
        alt_id: `finpay:${id}`,
        firma: text(z.firma) ?? '(ohne Firma)',
        text: text(z.text),
        kategorie: text(z.kategorie),
        rechnung_nr: text(z.rgNr),
        rechnung_am: zuDatum(z.rgDatum),
        betrag_rappen: zuRappen(z.betrag),
        faellig_am: zuDatum(z.faellig),
        geplant_am: zuDatum(z.geplantAm),
        prioritaet: text(z.prio),
        status: text(z.status) ?? 'offen',
        geprueft: z.geprueft === true,
        fixkosten_id: fixIds.get(`finfix:${text(z.fixId)}`) ?? null,
        monat: text(z.monat),
        notiz: text(z.notiz),
        quelle: text(z.quelle),
        alt_daten: z,
      },
    })),
  )

  await k.schreiber.schreibe(
    'material_zahlungen',
    Object.entries(k.sammlung('finmat')).map(([id, m]) => ({
      sammlung: 'finmat',
      schluessel: id,
      zeile: {
        alt_id: `finmat:${id}`,
        baustelle: text(m.baustelle) ?? id,
        projekt_id: k.ids.projekte.get(String(m.projektId)) ?? null,
        bautermin: zuDatum(m.bautermin),
        geplant_am: zuDatum(m.geplantAm),
        zahlbar_bis: zuDatum(m.zahlbarBis),
        positionen: m.pos ?? [],
        archiviert: m.archiv === true,
        notiz: text(m.notiz),
        quelle: text(m.quelle),
        alt_daten: m,
      },
    })),
  )

  await k.schreiber.schreibe(
    'erwartete_eingaenge',
    Object.entries(k.sammlung('finin')).map(([id, e]) => ({
      sammlung: 'finin',
      schluessel: id,
      zeile: {
        alt_id: `finin:${id}`,
        kunde: text(e.kunde) ?? id,
        text: text(e.text),
        betrag_rappen: zuRappen(e.betrag),
        erwartet_am: zuDatum(e.erwartetAm),
        eingang_am: zuDatum(e.eingangAm),
        wahrscheinlichkeit: text(e.prob),
        status: text(e.status) ?? 'offen',
        geprueft: e.geprueft === true,
        quelle: text(e.quelle),
        alt_daten: e,
      },
    })),
  )

  await k.schreiber.schreibe(
    'finanz_einstellungen',
    Object.entries(k.sammlung('finset')).map(([id, f]) => ({
      sammlung: 'finset',
      schluessel: id,
      zeile: { alt_id: `finset:${id}`, schluessel: `vorlage.${id}`, wert: f },
    })),
  )
}
