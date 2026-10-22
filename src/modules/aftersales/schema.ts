import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare des Moduls «Service & Garantie».
 * Die Meldungen sind i18n-Schlüssel und werden im Formular übersetzt.
 */
export const fallSchema = z.object({
  kontakt_id: z.string().min(1, 'pruefung.pflicht'),
  titel: z.string().trim().min(1, 'pruefung.pflicht').max(200),
  beschreibung: z.string().trim().max(8000),
  kategorie: z.string().min(1),
  prioritaet: z.string().min(1),
  garantie: z.boolean(),
  anlage_id: z.string(),
  person_id: z.string(),
  termin_am: z.string(),
})
