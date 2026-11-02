import type { Schritt } from '../types'

/** Rechnen mit Arbeitsschritten und Pflichtfotos einer Baustelle (Listen aus `einstellungen.baustelle`). */

/** Schlüssel, die erledigt sind: früher auf der Baustelle oder heute im Rapport. */
export function erledigteSchluessel(frueher: Record<string, string>, heute: Record<string, boolean>): Set<string> {
  return new Set([...Object.keys(frueher), ...Object.entries(heute).flatMap(([k, v]) => (v ? [k] : []))])
}

/** Fortschritt 0–100 nach erledigten Schritten (gleich gerundet wie die Datenbank). */
export function fortschritt(schritte: readonly Schritt[], erledigt: Set<string>): number {
  if (schritte.length === 0) return 0
  return Math.round((100 * schritte.filter((s) => erledigt.has(s.schluessel)).length) / schritte.length)
}

/** Die nächsten offenen Schritte (für «Heute dran» auf dem Tagesplan). */
export function naechsteSchritte(schritte: readonly Schritt[], erledigt: Set<string>, anzahl = 2): Schritt[] {
  return schritte.filter((s) => !erledigt.has(s.schluessel)).slice(0, anzahl)
}

/** Pflichtfotos, die auf der ganzen Baustelle noch fehlen. */
export function fehlendeFotos(pflicht: readonly Schritt[], da: Iterable<string>): Schritt[] {
  const vorhanden = new Set(da)
  return pflicht.filter((f) => !vorhanden.has(f.schluessel))
}

/** Text des Rapports aus den heute erledigten Schritten, in der Sprache der Person. */
export function schritteText(schritte: readonly Schritt[], heute: Record<string, boolean>, sprache: 'de' | 'fr'): string {
  return schritte
    .filter((s) => heute[s.schluessel])
    .map((s) => s[sprache])
    .join(', ')
}

/** Tag x von y eines mehrtägigen Einsatzes. */
export function einsatzTag(von: string, bis: string, tag: string): { nr: number; von: number } {
  const t = (d: string) => new Date(`${d}T12:00:00Z`).getTime()
  return { nr: Math.round((t(tag) - t(von)) / 86_400_000) + 1, von: Math.round((t(bis) - t(von)) / 86_400_000) + 1 }
}
