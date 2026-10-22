import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare und Daten des Moduls «Einkauf & Material».
 * Fehlertexte sind i18n-Schlüssel; dieselben Regeln gelten im Formular und vor dem Speichern.
 */
export const lieferantSchema = z.object({
  name: z.string().trim().min(1, 'einkauf.pruefung.name'),
  email_bestellung: z.union([z.literal(''), z.email('pruefung.email')]),
  kundennummer_bei_lieferant: z.string().trim(),
  telefon: z.string().trim(),
  sprache: z.enum(['de', 'fr']),
  aktiv: z.boolean(),
  notiz: z.string().trim(),
})
