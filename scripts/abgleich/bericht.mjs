// Abgleich-Bericht als Markdown: Zusammenfassung je Bereich und Feld, alle Abweichungen, Kennzahlen,
// Liquidität und die Auffälligkeiten der alten Daten.

/** @param {unknown} v */
const zeige = (v) => {
  if (v === null || v === undefined || v === '') return '–'
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 80 ? `${s.slice(0, 77)}…` : s.replace(/\|/g, '/').replace(/\n/g, ' ')
}
/** @param {number | null | undefined} r */
const chf = (r) =>
  r === null || r === undefined
    ? '–'
    : `${(r / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/’/g, "'")}`

/**
 * @param {{
 *   daten: import('../import/lesen.mjs').VorlageDaten, url: string, heute: string,
 *   befunde: import('./vergleich.mjs').Befunde, kennzahlen: Record<string, any>[],
 *   liquiditaet: Record<string, any>[], altdaten: import('./plausibel.mjs').Auffaelligkeit[],
 *   korrekturen: import('../import/ablage.mjs').Korrektur[],
 * }} x
 */
export function alsMarkdown({ daten, url, heute, befunde, kennzahlen, liquiditaet, altdaten, korrekturen }) {
  const fehler = befunde.liste.filter((b) => b.art === 'fehler')
  const hinweise = befunde.liste.filter((b) => b.art !== 'fehler')
  const z = [`# Abgleich altes CRM (V233) gegen Dimension Work`, '']
  z.push(`Export vom ${daten.at} · Datenbank ${url} · Stichtag ${heute}`, '')
  z.push('| Bereich | geprüfte Werte | Abweichungen |', '| --- | ---: | ---: |')
  for (const [bereich, n] of befunde.geprueft)
    z.push(`| ${bereich} | ${n} | ${fehler.filter((f) => f.bereich === bereich).length} |`)
  z.push('', `Auffälligkeiten in den alten Daten: ${altdaten.length}`, '')
  z.push(
    korrekturen.length
      ? `Stand «gewonnen» nach SharePoint Adjudications korrigiert: ${korrekturen.length} Offerten (Liste unten). Erwartet wird der korrigierte Stand.`
      : 'Ohne Ablage-Liste (--ablage): Stand «gewonnen» wie im alten CRM.',
    '',
  )

  /** @type {Map<string, import('./vergleich.mjs').Befund[]>} */
  const gruppen = new Map()
  for (const f of fehler)
    gruppen.set(`${f.bereich} › ${f.feld}`, [...(gruppen.get(`${f.bereich} › ${f.feld}`) ?? []), f])
  z.push('## Abweichungen nach Feld', '', '| Bereich › Feld | Anzahl | Beispiele (alt → neu) |', '| --- | ---: | --- |')
  for (const [k, l] of [...gruppen].sort((a, b) => b[1].length - a[1].length))
    z.push(
      `| ${k} | ${l.length} | ${l
        .slice(0, 3)
        .map((f) => `${f.datensatz}: ${zeige(f.alt)} → ${zeige(f.neu)}`)
        .join('; ')} |`,
    )

  z.push(
    '',
    '## Kennzahlen (Zeitraum · Spalte)',
    '',
    '| Zeitraum | Spalte | Kennzahl | alt (V233) | erwartet | neu | nur alt | nur neu |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- |',
  )
  const stimmt = (/** @type {Record<string, any>} */ k) =>
    (k.erwartet ?? k.alt) === k.neu && !k.fehlen?.length && !k.zuviel?.length
  for (const k of kennzahlen) {
    const geld = /wert/i.test(k.kennzahl)
    if (stimmt(k)) continue
    const w = (/** @type {unknown} */ v) => (geld ? chf(/** @type {number} */ (v)) : zeige(v))
    z.push(
      `| ${k.zeitraum} | ${k.spalte} | ${k.kennzahl} | ${w(k.alt)} | ${w(k.erwartet ?? k.alt)} | ${w(k.neu)} | ${zeige(k.fehlen?.join(', '))} | ${zeige(k.zuviel?.join(', '))} |`,
    )
  }
  z.push('', `Alle anderen ${kennzahlen.filter(stimmt).length} Kennzahl-Zellen stimmen (Zahl und Datensätze).`)
  if (korrekturen.length)
    z.push(
      '',
      '## Stand nach SharePoint Adjudications',
      '',
      '| Offerte | Stand alt | Stand neu | Grund |',
      '| --- | --- | --- | --- |',
      ...korrekturen.map((x) => `| ${x.nr} | ${x.vorher || '(leer)'} | ${x.nachher} | ${x.grund} |`),
    )

  z.push(
    '',
    '## Liquidität (Szenario realistisch)',
    '',
    '| Woche ab | Eingänge alt | neu | Ausgänge alt | neu | Stand alt | neu |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const w of liquiditaet.filter((x) => x.szenario === 'real'))
    z.push(
      `| ${w.woche} | ${chf(w.alt_ein)} | ${chf(w.neu_ein)} | ${chf(w.alt_aus)} | ${chf(w.neu_aus)} | ${chf(w.alt_ende)} | ${chf(w.neu_ende)} |`,
    )

  z.push(
    '',
    '## Alle Abweichungen',
    '',
    '| Bereich | Datensatz | Feld | alt (V233) | neu | Grund |',
    '| --- | --- | --- | --- | --- | --- |',
  )
  for (const f of fehler)
    z.push(`| ${f.bereich} | ${f.datensatz} | ${f.feld} | ${zeige(f.alt)} | ${zeige(f.neu)} | ${zeige(f.grund)} |`)
  z.push(
    '',
    '## Hinweise (bewusst anders oder nur zur Kenntnis)',
    '',
    '| Bereich | Datensatz | Feld | alt | neu | Grund |',
    '| --- | --- | --- | --- | --- | --- |',
  )
  for (const f of hinweise)
    z.push(`| ${f.bereich} | ${f.datensatz} | ${f.feld} | ${zeige(f.alt)} | ${zeige(f.neu)} | ${zeige(f.grund)} |`)
  z.push(
    '',
    '## Auffälligkeiten in den alten Daten',
    '',
    '| Bereich | Datensatz | Regel | Wert | Vorschlag |',
    '| --- | --- | --- | --- | --- |',
  )
  for (const x of altdaten) z.push(`| ${x.bereich} | ${x.datensatz} | ${x.regel} | ${zeige(x.wert)} | ${x.vorschlag} |`)
  return z.join('\n') + '\n'
}
