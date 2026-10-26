import { z } from 'zod'

const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Ausweis: Art ist Pflicht; «gültig bis» nicht vor «erworben am». */
export const ausweisSchema = z
  .object({ art: z.string().min(1), erworben_am: datum.nullable(), gueltig_bis: datum.nullable() })
  .refine((a) => !a.erworben_am || !a.gueltig_bis || a.gueltig_bis >= a.erworben_am, { path: ['gueltig_bis'] })

/** Personal-Akte: Pensum 1–100 %, Austritt nicht vor Eintritt. */
export const akteSchema = z
  .object({
    pensum: z.number().int().min(1).max(100).nullable(),
    eintritt: datum.nullable(),
    austritt: datum.nullable(),
  })
  .refine((a) => !a.eintritt || !a.austritt || a.austritt >= a.eintritt, { path: ['austritt'] })
