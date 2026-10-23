import { z } from 'zod'

/**
 * Prüfregeln (Zod) für das Erfassen einer Spese. Betrag als Text wie im Feld («12.50»), Datum ISO.
 * Dieselben Regeln gelten im Formular und vor dem Speichern.
 */
export const speseSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  betrag_rappen: z.number().int().positive(),
  kategorie: z.string().min(1),
  zweck: z.string().trim().min(2),
})
