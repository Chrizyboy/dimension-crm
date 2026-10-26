import { z } from 'zod'

/**
 * Prüfregeln (Zod) des Handbuchs. Dieselben Regeln prüft die Datenbank vor dem Speichern noch einmal
 * (`handbuch_speichern`, `rueckmeldung_melden`).
 */

/** Prozess: Titel Pflicht, PDF beim ersten Ablegen Pflicht. */
export const prozessSchema = z
  .object({
    neu: z.boolean(),
    titel_de: z.string().trim().min(1, 'handbuch.fehler.titel'),
    datei_de: z.instanceof(File).nullable(),
  })
  .refine((p) => !p.neu || p.datei_de !== null, { message: 'handbuch.fehler.pdf', path: ['datei_de'] })

/** Video: Titel Pflicht, Datei beim ersten Ablegen Pflicht und höchstens 20 MB (wie V233). */
export const VIDEO_MAX_BYTES = 20 * 1024 * 1024
export const videoSchema = z
  .object({
    neu: z.boolean(),
    titel_de: z.string().trim().min(1, 'handbuch.fehler.titel'),
    datei_de: z.instanceof(File).nullable(),
  })
  .refine((v) => !v.neu || v.datei_de !== null, { message: 'handbuch.fehler.video', path: ['datei_de'] })
  .refine((v) => !v.datei_de || v.datei_de.size <= VIDEO_MAX_BYTES, {
    message: 'handbuch.fehler.videoGross',
    path: ['datei_de'],
  })

/** Meldung: kurz worum es geht und was passiert ist. */
export const meldungSchema = z.object({
  titel: z.string().trim().min(1, 'handbuch.fehler.meldungTitel'),
  text: z.string().trim().min(1, 'handbuch.fehler.meldungText'),
})
