import type { Auswahlwert } from '@/types/kontakt'
import type { TaetigkeitRegel } from '../types'

/** Pflicht-Ausweise je Tätigkeit aus der Auswahlliste «taetigkeit» lesen (Regeln sind Daten, nie Code). */
export function taetigkeitRegeln(werte: Auswahlwert[]): TaetigkeitRegel[] {
  return werte.map((w) => {
    const e = w.eigenschaften as { ausweise?: string[]; wer?: string; immer?: boolean }
    return {
      schluessel: w.schluessel,
      ausweise: e.ausweise ?? [],
      wer: e.wer === 'einer' ? 'einer' : 'alle',
      immer: e.immer === true,
    }
  })
}

/** Tage von «heute» bis «datum» (beide «JJJJ-MM-TT»); 0 = heute. */
export function tageBis(datum: string, heute: string): number {
  const [a, b] = [datum, heute].map((d) => {
    const [j, m, t] = d.split('-').map(Number)
    return Date.UTC(j ?? 1970, (m ?? 1) - 1, t ?? 1)
  })
  return Math.round(((a ?? 0) - (b ?? 0)) / 86_400_000)
}
