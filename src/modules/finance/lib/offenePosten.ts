import type { Finanzdaten } from '../types'

const feld = (x: string | number | null | undefined) => {
  const s = x === null || x === undefined ? '' : String(x)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const chf = (rappen: number) => (rappen / 100).toFixed(2)

/**
 * Offene Posten als CSV (Semikolon, für Excel in der Schweiz): Kundenrechnungen (Debitoren) und
 * Lieferantenrechnungen (Kreditoren, ohne Löhne) mit Gesellschaft, Fälligkeit und offenem Betrag in CHF.
 */
export function offenePostenCsv(d: Finanzdaten): string {
  const firma = (id: string | null | undefined) => d.firmen.find((f) => f.id === id)?.name ?? ''
  const zeilen = [['Art', 'Gesellschaft', 'Gegenpartei', 'Nummer', 'Projekt', 'Fällig', 'Offen CHF']]
  for (const r of d.rechnungen)
    zeilen.push([
      'Debitor',
      firma(r.firma_id),
      r.kunde,
      r.nummer ?? '',
      r.projekt_nummer ?? '',
      r.faellig_am ?? '',
      chf(r.offen_rappen),
    ])
  for (const z of d.zahlungen.filter((x) => x.status === 'offen' && x.kategorie !== 'Lohn'))
    zeilen.push([
      'Kreditor',
      firma(z.firma_id),
      z.firma ?? '',
      z.rechnung_nr ?? '',
      '',
      z.faellig_am ?? '',
      chf(z.offen_rappen ?? z.betrag_rappen ?? 0),
    ])
  // BOM, damit Excel Umlaute richtig liest.
  return `\uFEFF${zeilen.map((z) => z.map(feld).join(';')).join('\r\n')}\r\n`
}
