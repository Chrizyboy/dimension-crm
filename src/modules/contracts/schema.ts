import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare des Moduls «Wartungsverträge».
 * Die Meldungen sind i18n-Schlüssel und werden im Formular übersetzt.
 */
export const vertragSchema = z.object({
  kontakt_id: z.string().min(1, 'pruefung.pflicht'),
  start_am: z.string().min(1, 'pruefung.pflicht'),
  laufzeit_jahre: z.number().int().min(1, 'pruefung.pflicht').max(20),
  paket: z.string().nullable(),
  sprache: z.enum(['de', 'fr']),
  status: z.string().min(1),
  notiz: z.string().trim().max(4000),
  leistungen: z.array(z.object({ de: z.string(), fr: z.string() })).min(1, 'wartung.pruefung.leistung'),
})

/** Zahl aus einem Eingabefeld (Komma oder Punkt), leer = null, ungültig = NaN. */
export function zahlAusFeld(text: string): number | null {
  const s = text
    .trim()
    .replace(',', '.')
    .replace(/['’\s]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN
}
