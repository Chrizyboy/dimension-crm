/** Felder der Vor-Ort-Besichtigung wie in V233 (VISIT_FIELDS). */
export interface Besichtigung {
  datum?: string
  flaeche?: string
  ausrichtung?: string
  neigung?: string
  material?: string
  anschluss?: string
  verbrauch?: string
  notiz?: string
}

/** Wie viele Felder ausgefüllt sind, z. B. «5/8» im Kopf des Abschnitts. */
export function besichtigungStand(b: Besichtigung | null | undefined): string {
  const felder = ['datum', 'flaeche', 'ausrichtung', 'neigung', 'material', 'anschluss', 'verbrauch', 'notiz'] as const
  return `${felder.filter((f) => b?.[f]).length}/${felder.length}`
}
