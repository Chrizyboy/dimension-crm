import { z } from 'zod'

/**
 * Prüfregeln (Zod) für das Ändern eines Eintrags vor der Freigabe. Die Datenbank prüft dieselben Regeln
 * noch einmal (ausgang_aendern); hier geht es um schnelle Rückmeldung im Formular.
 */
export const aenderungSchema = z
  .object({
    kanal: z.enum(['mail', 'sms', 'brief']),
    an: z.string().trim().min(1, 'pruefung.pflicht'),
    cc: z.string().trim(),
    betreff: z.string().trim(),
    text: z.string().trim().min(1, 'pruefung.pflicht'),
  })
  .superRefine((w, ctx) => {
    if (w.kanal === 'mail' && !w.betreff)
      ctx.addIssue({ code: 'custom', path: ['betreff'], message: 'pruefung.pflicht' })
    if (w.kanal === 'mail' && !/^[^@\s]+@[^@\s]+\.[^@\s]+(\s*[,;]\s*[^@\s]+@[^@\s]+\.[^@\s]+)*$/.test(w.an)) {
      ctx.addIssue({ code: 'custom', path: ['an'], message: 'pruefung.email' })
    }
  })

export type AusgangAenderung = z.infer<typeof aenderungSchema>
