import { z } from 'zod'
import { ahvGueltig, ibanGueltig } from './lib/akte'

const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Ausweis: Art ist Pflicht; «gültig bis» nicht vor «erworben am». */
export const ausweisSchema = z
  .object({ art: z.string().min(1), erworben_am: datum.nullable(), gueltig_bis: datum.nullable() })
  .refine((a) => !a.erworben_am || !a.gueltig_bis || a.gueltig_bis >= a.erworben_am, { path: ['gueltig_bis'] })

/**
 * Personal-Akte: Pensum 1–100 %, Wochenstunden bis 60, Ferien bis 60 Tage, Kündigungsfrist bis 12 Monate,
 * PLZ vierstellig, AHV-Nummer und IBAN mit Prüfziffer, Austritt nicht vor Eintritt. Felder sind alle freiwillig.
 */
export const akteSchema = z
  .object({
    pensum: z.number().int().min(1).max(100).nullish(),
    wochenstunden: z.number().gt(0).max(60).nullish(),
    ferientage: z.number().min(0).max(60).nullish(),
    kuendigungsfrist_monate: z.number().int().min(0).max(12).nullish(),
    plz: z
      .string()
      .regex(/^\d{4}$/)
      .nullish(),
    mail_privat: z.email().nullish(),
    ahv_nr: z.string().refine(ahvGueltig).nullish(),
    iban: z.string().refine(ibanGueltig).nullish(),
    eintritt: datum.nullish(),
    austritt: datum.nullish(),
  })
  .refine((a) => !a.eintritt || !a.austritt || a.austritt >= a.eintritt, { path: ['austritt'] })

/** Lohn zur Info: Betrag ab 0, gültig ab ist Pflicht. */
export const lohnSchema = z.object({
  gueltig_ab: datum,
  lohnart: z.enum(['monat', 'stunde']),
  betrag_rappen: z.number().int().min(0),
})

/** Gespräch: Datum und Art Pflicht; das nächste Gespräch liegt nach diesem. */
export const gespraechSchema = z
  .object({ datum, art: z.string().min(1), naechstes: datum.nullable() })
  .refine((g) => !g.naechstes || g.naechstes > g.datum, { path: ['naechstes'] })
