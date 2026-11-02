import type { Aktion, Automation, Versandfenster } from '../types'

/** Bereiche der Liste, in der Reihenfolge eines Auftrags (Lead → Offerte → Projekt → Service → Finanzen). */
export const BEREICHE = ['verkauf', 'offerten', 'projekte', 'service', 'finanzen', 'marketing'] as const
export type Bereich = (typeof BEREICHE)[number]

const VORSILBE: Record<string, Bereich> = {
  lead: 'verkauf',
  offerte: 'offerten',
  auftrag: 'projekte',
  projekt: 'projekte',
  anlage: 'service',
  garantie: 'service',
  wartung: 'service',
  service: 'service',
  einsatz: 'projekte',
  rapport: 'projekte',
  bestellung: 'projekte',
  rechnung: 'finanzen',
  zeit: 'marketing',
}

/** Bereich einer Automation aus dem Auslöser («offerte.gesendet» → «offerten»); Unbekanntes unter Marketing. */
export function bereichVon(ausloeser: string): Bereich {
  return VORSILBE[ausloeser.split('.')[0] ?? ''] ?? 'marketing'
}

/** Automationen nach Bereich gruppiert, leere Bereiche weggelassen. */
export function nachBereich<T extends Pick<Automation, 'ausloeser'>>(liste: readonly T[]): [Bereich, T[]][] {
  return BEREICHE.map((b) => [b, liste.filter((a) => bereichVon(a.ausloeser) === b)] as [Bereich, T[]]).filter(
    ([, l]) => l.length > 0,
  )
}

/** Passt eine Automation zur Suche (Name, Beschreibung in beiden Sprachen)? */
export function passtZuSuche(
  a: Pick<Automation, 'name_de' | 'name_fr' | 'beschreibung_de' | 'beschreibung_fr'>,
  suche: string,
): boolean {
  const s = suche.trim().toLowerCase()
  if (!s) return true
  return [a.name_de, a.name_fr, a.beschreibung_de, a.beschreibung_fr].some((x) => x?.toLowerCase().includes(s))
}

/**
 * Lesesatz-Teile: nach welchen Wartezeiten welche Schritte kommen («sofort Aufgabe, nach 3 Tagen Mail …»).
 * Die Oberfläche setzt daraus den Satz in der Sprache der Person zusammen.
 */
export function ablauf(aktionen: readonly Aktion[]): { tage: number; arbeitstage: boolean; art: Aktion['art'] }[] {
  let tage = 0
  let arbeitstage = false
  const schritte: { tage: number; arbeitstage: boolean; art: Aktion['art'] }[] = []
  for (const x of aktionen) {
    if (x.art === 'warten') {
      tage += x.tage ?? 0
      arbeitstage = arbeitstage || Boolean(x.arbeitstage)
    } else if (x.art !== 'pruefen') {
      schritte.push({ tage, arbeitstage, art: x.art })
    }
  }
  return schritte
}

/** Versandfenster als kurzer Text-Baustein: Tage «Mo–Fr» und Zeit «08:00–18:00»; null = immer. */
export function fensterText(f: Versandfenster | null | undefined, tagNamen: readonly string[]): string | null {
  if (!f || f.immer) return null
  const tage = [...(f.tage ?? [1, 2, 3, 4, 5])].sort((a, b) => a - b)
  const zusammenhaengend = tage.every((t, i) => i === 0 || t === (tage[i - 1] ?? 0) + 1)
  const name = (t: number) => tagNamen[t - 1] ?? String(t)
  const tageText =
    tage.length === 0
      ? ''
      : zusammenhaengend && tage.length > 2
        ? `${name(tage[0] ?? 1)}–${name(tage[tage.length - 1] ?? 7)}`
        : tage.map(name).join(', ')
  return `${tageText} ${f.von ?? '08:00'}–${f.bis ?? '18:00'}`.trim()
}
