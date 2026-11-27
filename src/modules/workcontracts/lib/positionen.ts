import type { OffertPosition } from '../types'

/**
 * Stückliste der Offerte (jsonb aus Eturnity) → Positionen für das Dokument. Unbekanntes wird übersprungen
 * statt geraten; das Modul «Offerten» hat dafür eine eigene Fassung (Module importieren sich nie gegenseitig).
 */
export function positionenAusDb(roh: unknown): OffertPosition[] {
  if (!Array.isArray(roh)) return []
  return roh.flatMap((x: unknown): OffertPosition[] => {
    if (!x || typeof x !== 'object') return []
    const r = x as Record<string, unknown>
    if (typeof r.bezeichnung !== 'string' || !r.bezeichnung.trim()) return []
    return [
      {
        bezeichnung: r.bezeichnung.trim(),
        menge: Number(r.menge) || 0,
        einheit: typeof r.einheit === 'string' ? r.einheit : '',
        art: r.art === 'leistung' ? 'leistung' : 'material',
        optional: r.optional === true,
      },
    ]
  })
}

/**
 * Was der Kunde bestellt hat (feste Positionen und gewählte Optionen) und welche Optionen offen bleiben.
 * Gewählt wird über die Bezeichnung, damit eine neu eingelesene Stückliste die Wahl nicht verschiebt.
 */
export function aufteilen(
  positionen: readonly OffertPosition[],
  gewaehlt: readonly string[] = [],
): { bestellt: OffertPosition[]; offen: OffertPosition[] } {
  const wahl = new Set(gewaehlt)
  return {
    bestellt: positionen.filter((p) => !p.optional || wahl.has(p.bezeichnung)),
    offen: positionen.filter((p) => p.optional && !wahl.has(p.bezeichnung)),
  }
}

/** «2 × Batterie BYD LVS 4.0»; Menge 1 Stück und Pauschalen ohne Zahl. */
export function positionText(p: OffertPosition, fr: boolean): string {
  const pauschal = /^(pausch|forfait|psch|pce?\.?$)/i.test(p.einheit)
  if (!p.menge || (p.menge === 1 && (pauschal || /^(stk|st|pcs?|pièces?)\.?$/i.test(p.einheit) || !p.einheit)))
    return p.bezeichnung
  const zahl = p.menge.toLocaleString(fr ? 'fr-CH' : 'de-CH')
  const stueck = !p.einheit || /^(stk|st|pcs?|pièces?)\.?$/i.test(p.einheit)
  return stueck ? `${zahl} × ${p.bezeichnung}` : `${zahl} ${p.einheit} ${p.bezeichnung}`
}
