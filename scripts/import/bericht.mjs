// Zählbericht: Stimmt für jede Sammlung der Vorlage die Anzahl im Export mit der Anzahl im neuen CRM?
// Der Bericht enthält nur Zahlen und Hinweise, keine Kundendaten.

/**
 * @typedef {{ sammlung: string, export: number, laut_export: number | null, uebernommen: number, ziele: Record<string, number>, ok: boolean }} Zeile
 * @typedef {{ zeilen: Zeile[], abgeleitet: Record<string, number>, unbekannt: { liste: string, wert: string, wo: string }[], hinweise: string[], dateien: { export: number, hochgeladen: number }, ok: boolean }} Bericht
 */

/** Sammlungen, die der Import selbst bildet (keine eigene Sammlung in der Vorlage). */
const ABGELEITET = new Set(['kundennummern', 'adressen'])

/**
 * @param {import('./lesen.mjs').VorlageDaten} daten
 * @param {{ sammlung: string, alt_schluessel: string, ziel_tabelle: string }[]} abgleich
 * @param {{ liste: string, wert: string, wo: string }[]} unbekannt
 * @param {string[]} hinweise
 * @param {number} hochgeladen
 * @returns {Bericht}
 */
export function erstelleBericht(daten, abgleich, unbekannt, hinweise, hochgeladen) {
  /** @type {Map<string, { schluessel: Set<string>, ziele: Record<string, number> }>} */
  const proSammlung = new Map()
  for (const a of abgleich) {
    const e = proSammlung.get(a.sammlung) ?? { schluessel: new Set(), ziele: {} }
    e.schluessel.add(a.alt_schluessel)
    e.ziele[a.ziel_tabelle] = (e.ziele[a.ziel_tabelle] ?? 0) + 1
    proSammlung.set(a.sammlung, e)
  }
  const sammlungen = [...new Set([...Object.keys(daten.cols), ...Object.keys(daten.counts ?? {})])].sort()
  /** @type {Zeile[]} */
  const zeilen = sammlungen.map((sammlung) => {
    const exportiert = Object.keys(daten.cols[sammlung] ?? {}).length
    const e = proSammlung.get(sammlung)
    const uebernommen = e?.schluessel.size ?? 0
    const lautExport = daten.counts?.[sammlung] ?? null
    return {
      sammlung,
      export: exportiert,
      laut_export: lautExport,
      uebernommen,
      ziele: e?.ziele ?? {},
      ok: uebernommen === exportiert && (lautExport === null || lautExport === exportiert),
    }
  })
  const blobs = proSammlung.get('blobs')
  zeilen.push({
    sammlung: 'blobs (Dateien)',
    export: daten.blobs.length,
    laut_export: null,
    uebernommen: blobs?.schluessel.size ?? 0,
    ziele: blobs?.ziele ?? {},
    ok: (blobs?.schluessel.size ?? 0) === daten.blobs.length && hochgeladen === daten.blobs.length,
  })
  const abgeleitet = Object.fromEntries([...ABGELEITET].map((s) => [s, proSammlung.get(s)?.schluessel.size ?? 0]))
  return {
    zeilen,
    abgeleitet,
    unbekannt,
    hinweise,
    dateien: { export: daten.blobs.length, hochgeladen },
    ok: zeilen.every((z) => z.ok) && unbekannt.length === 0,
  }
}

/**
 * Bericht als Markdown-Tabelle für Menschen.
 * @param {Bericht} b
 * @param {{ export_vom: string, export_von: string, dauer_s: number }} info
 * @returns {string}
 */
export function alsMarkdown(b, info) {
  const z = (/** @type {Zeile} */ r) =>
    `| ${r.sammlung} | ${r.export} | ${r.uebernommen} | ${
      Object.entries(r.ziele)
        .map(([t, n]) => `${t} ${n}`)
        .join(', ') || '–'
    } | ${r.ok ? 'stimmt' : '**FEHLER**'} |`
  return [
    `# Import-Bericht Vorlage V233`,
    '',
    `Export vom ${info.export_vom} (${info.export_von}), Dauer ${info.dauer_s} s. Ergebnis: **${b.ok ? 'alles stimmt' : 'nicht vollständig'}**.`,
    '',
    '| Sammlung | im Export | übernommen | Ziel (Zeilen) | Zählung |',
    '| --- | ---: | ---: | --- | --- |',
    ...b.zeilen.map(z),
    '',
    `Abgeleitet: ${b.abgeleitet.kundennummern} Kontakte aus Kundennummern, ${b.abgeleitet.adressen} Objekte aus Adressen. Dateien hochgeladen: ${b.dateien.hochgeladen} von ${b.dateien.export}.`,
    '',
    b.unbekannt.length
      ? `## Unbekannte Werte\n\n${b.unbekannt.map((u) => `- ${u.liste}: «${u.wert}» (${u.wo})`).join('\n')}`
      : 'Keine unbekannten Auswahlwerte.',
    '',
    b.hinweise.length ? `## Hinweise\n\n${b.hinweise.map((h) => `- ${h}`).join('\n')}` : 'Keine Hinweise.',
    '',
  ].join('\n')
}
