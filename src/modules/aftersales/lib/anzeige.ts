/** Tage bis zu einem Datum («JJJJ-MM-TT»), negativ = vorbei. */
export function tageBis(datum: string | null, heute: Date): number | null {
  if (!datum) return null
  const [j, m, t] = datum.slice(0, 10).split('-').map(Number)
  const d = new Date(j ?? 1970, (m ?? 1) - 1, t ?? 1)
  const h = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate())
  return Math.round((d.getTime() - h.getTime()) / 86_400_000)
}

/** Kontrolle oder Wartung fällig: vorbei oder in den nächsten 30 Tagen. */
export const faellig = (datum: string | null, heute: Date) => (tageBis(datum, heute) ?? 999) <= 30
