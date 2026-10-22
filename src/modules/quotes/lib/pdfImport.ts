import type { Eingang, Offerte, PdfWerte } from '../types'

/** Was mit einem PDF aus dem Stapel geschieht (V183). */
export type ImportZiel =
  { art: 'offerte'; offerteId: string } | { art: 'lead'; verkaufschanceId: string } | { art: 'keins' }

/** Vergleichbare Form eines Namens: klein, ohne Akzente und Satzzeichen. */
function normal(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
}

/**
 * Sucht das Ziel für ein gelesenes PDF: zuerst eine Offerte mit derselben Nummer, sonst ein Lead in
 * «Neue Offerten», dessen Name den Kundennamen aus dem PDF enthält (Eturnity schreibt «MURER»).
 * Ist der Name nicht eindeutig, wird nichts geraten.
 */
export function findeZiel(p: PdfWerte, offerten: readonly Offerte[], eingang: readonly Eingang[]): ImportZiel {
  const o = p.nummer ? offerten.find((x) => x.nummer === p.nummer) : undefined
  if (o) return { art: 'offerte', offerteId: o.id }
  const kunde = p.kunde ? normal(p.kunde) : ''
  if (kunde.length < 2) return { art: 'keins' }
  const woerter = kunde.split(/\s+/)
  const passende = eingang.filter((e) => {
    const teile = normal(e.name).split(/\s+/)
    return !e.offerteId && woerter.every((w) => teile.includes(w))
  })
  return passende.length === 1 && passende[0] ? { art: 'lead', verkaufschanceId: passende[0].id } : { art: 'keins' }
}
