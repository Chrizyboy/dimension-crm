import type { KiBezug } from '@/services/ki'

/** Welcher Datensatz in der Adresse offen ist (z. B. #/sales?lead=…) und welche Tabelle dazu gehört. */
const PARAMETER: [string, KiBezug['tabelle']][] = [
  ['kunde', 'kontakte'],
  ['lead', 'verkaufschancen'],
  ['offerte', 'offerten'],
  ['projekt', 'projekte'],
  ['fall', 'service_faelle'],
]

/** Bezug aus den Suchparametern der Adresse; ohne offenen Datensatz null. */
export function bezugAusAdresse(suche: Record<string, unknown>): KiBezug | null {
  for (const [p, tabelle] of PARAMETER) {
    const w = suche[p]
    if (typeof w === 'string' && /^[0-9a-f-]{36}$/i.test(w)) return { tabelle, id: w }
  }
  return null
}
