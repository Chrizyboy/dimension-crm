import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare des Moduls «Wartungsverträge».
 * Die Meldungen sind i18n-Schlüssel und werden im Formular übersetzt.
 */
export const vertragSchema = z.object({
  kontakt_id: z.string().min(1, 'pruefung.pflicht'),
  projekt_id: z.string(),
  start_am: z.string().min(1, 'pruefung.pflicht'),
  laufzeit_jahre: z.number().int().min(1, 'pruefung.pflicht').max(20),
  rhythmus_monate: z.number().int().min(1, 'pruefung.pflicht').max(60),
  preis: z.string(),
  sprache: z.enum(['de', 'fr']),
  status: z.string().min(1),
  notiz: z.string().trim().max(4000),
  leistungen: z.array(z.object({ de: z.string(), fr: z.string() })).min(1, 'wartung.pruefung.leistung'),
})
