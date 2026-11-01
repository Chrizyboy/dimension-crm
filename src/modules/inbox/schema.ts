import { z } from 'zod'

const uhrzeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'posteingang.pruefung.uhrzeit')
const stunden = z
  .string()
  .trim()
  .refine(
    (s) => s === '' || (/^\d+([.,]\d+)?$/.test(s) && Number(s.replace(',', '.')) <= 200),
    'posteingang.pruefung.stunden',
  )

/**
 * Prüfregeln (Zod) für die Einstellungen des Posteingangs: Arbeitszeit (von vor bis), Fristen in Stunden (leer = keine
 * Antwort nötig), Vorwarnung in Minuten.
 */
export const regelnSchema = z
  .object({
    von: uhrzeit,
    bis: uhrzeit,
    vorwarnung: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, 'posteingang.pruefung.minuten'),
    fristen: z.record(z.string(), stunden),
  })
  .refine((w) => w.von < w.bis, { message: 'posteingang.pruefung.zeitraum', path: ['bis'] })

export type RegelnEingabe = z.infer<typeof regelnSchema>

/** Stunden-Text → Arbeitsminuten (leer = keine Frist). */
export const minutenAus = (s: string): number | null =>
  s.trim() === '' ? null : Math.round(Number(s.trim().replace(',', '.')) * 60)

/** Arbeitsminuten → Stunden-Text für das Feld. */
export const stundenText = (min: number | null | undefined): string =>
  min == null ? '' : String(Math.round((min / 60) * 100) / 100)
