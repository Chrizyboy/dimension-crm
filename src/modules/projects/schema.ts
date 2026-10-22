import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare des Moduls «Projekte & Montage».
 * Die Meldungen sind i18n-Schlüssel und werden im Formular übersetzt.
 */
export const subunternehmerSchema = z.object({
  name: z.string().trim().min(1, 'pruefung.pflicht'),
  gewerk: z.string().trim(),
  email: z.union([z.literal(''), z.email('pruefung.email')]),
  telefon: z.string().trim(),
  sprache: z.enum(['de', 'fr']),
  aktiv: z.boolean(),
  notiz: z.string().trim(),
})

/** Abwesenheit: wer, von, bis; «bis» nicht vor «von». */
export const abwesenheitSchema = z
  .object({
    person_id: z.string().min(1, 'pruefung.pflicht'),
    art: z.string().min(1),
    von: z.string().min(1, 'pruefung.pflicht'),
    bis: z.string().min(1, 'pruefung.pflicht'),
    halbtag: z.boolean(),
  })
  .refine((a) => a.bis >= a.von, { message: 'fachfehler.einsatz_bis_vor_von', path: ['bis'] })
