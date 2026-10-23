import { z } from 'zod'

/**
 * Prüfregeln (Zod) für die KI-Einstellungen. Limits in Rappen, höchstens CHF 1000 pro Tag,
 * damit ein Tippfehler nicht teuer wird.
 */
export const einstellungSchema = z.object({
  tageslimit_rappen: z.number().int().min(0).max(100_000),
  person_limit_rappen: z.number().int().min(0).max(100_000).nullable(),
  usd_chf: z.number().min(0.5).max(2),
  modelle: z.object({
    standard: z.string().regex(/^claude-[a-z0-9-]+$/),
    schnell: z.string().regex(/^claude-[a-z0-9-]+$/),
  }),
})
