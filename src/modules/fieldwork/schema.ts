import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare des Moduls «Baustelle & Rapporte». Fehlertexte sind i18n-Schlüssel;
 * die Datenbank prüft dasselbe noch einmal (`zeit_speichern`).
 */
export const zeitSchema = z
  .object({
    datum: z.iso.date('baustelle.pruefung.datum'),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'baustelle.pruefung.uhrzeit'),
    stopp: z.string().regex(/^\d{2}:\d{2}$/, 'baustelle.pruefung.uhrzeit'),
    pause_min: z.number().int().min(0, 'baustelle.pruefung.pause').max(600, 'baustelle.pruefung.pause'),
  })
  .refine((z) => z.stopp > z.start, { message: 'baustelle.pruefung.stoppVorStart', path: ['stopp'] })
