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
  quelle: z.string().min(1),
  auswirkung: z.string(),
  komponente: z.string(),
  fehlercode: z.string().trim().max(100),
  vor_ort_name: z.string().trim().max(200),
  vor_ort_telefon: z.string().trim().max(40),
  zugang: z.string().trim().max(1000),
})
