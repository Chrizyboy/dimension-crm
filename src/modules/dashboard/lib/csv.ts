import type { Fakt } from '../types'

/** CSV der Zeilen (Semikolon, wie Excel in der Schweiz es öffnet), Beträge in Franken. */
export function alsCsv(fakten: readonly Fakt[], kopf: readonly string[]): string {
  const feld = (w: string | number | null | undefined) => `"${String(w ?? '').replace(/"/g, '""')}"`
  const zeilen = fakten.map((f) =>
    [
      f.datum ?? '',
      f.nummer,
      f.name,
      f.ort,
      f.betrag_rappen === null ? '' : (f.betrag_rappen / 100).toFixed(2),
      f.kwp,
      f.tage,
      f.zusatz ?? f.stand,
    ]
      .map(feld)
      .join(';'),
  )
  return `\uFEFF${[kopf.map(feld).join(';'), ...zeilen].join('\r\n')}`
}
