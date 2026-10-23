import { z } from 'zod'

/** Prüfregeln für «Neue Aufgabe»: Titel Pflicht, Datum im Format JJJJ-MM-TT (Eingabe type=date). */
export const aufgabeSchema = z.object({
  titel: z.string().trim().min(1, 'aufgaben.fehler.titel').max(200),
  text: z.string().trim().max(2000).optional(),
  faellig_am: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'aufgaben.fehler.datum')
    .optional()
    .or(z.literal('')),
  person_id: z.uuid('aufgaben.fehler.person'),
})
export type AufgabeEingabe = z.infer<typeof aufgabeSchema>
