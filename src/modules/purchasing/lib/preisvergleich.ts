import type { Vergleichspreis } from '../services/material'

/**
 * Günstigerer Lieferant für eine Position: nur wenn ein anderer Lieferant den Artikel billiger hat.
 * Liefert Lieferant, Preis und Ersparnis pro Einheit (Rappen), sonst null.
 */
export function guenstiger(
  artikelId: string | null,
  lieferantId: string,
  ekRappen: number | null,
  preise: Vergleichspreis[],
): { lieferant: string; ek_rappen: number; ersparnis: number } | null {
  if (!artikelId || ekRappen === null) return null
  const best = preise
    .filter((p) => p.artikel_id === artikelId && p.lieferant_id !== lieferantId)
    .sort((a, b) => a.ek_rappen - b.ek_rappen)[0]
  if (!best || best.ek_rappen >= ekRappen) return null
  return { lieferant: best.lieferant, ek_rappen: best.ek_rappen, ersparnis: ekRappen - best.ek_rappen }
}
