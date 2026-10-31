import { z } from 'zod'
import { BAUHERR_ARTEN, HEIZUNGEN, NUTZUNGEN } from './types'

const zahl = (max: number) =>
  z
    .string()
    .trim()
    .refine((s) => s === '' || (/^\d+$/.test(s) && Number(s) <= max), 'grossprojekte.pruefung.zahl')

/**
 * Prüfregeln (Zod) für das Formular «Grossprojekt erfassen/ändern». Dieselben Pflichtfelder prüft die Datenbank
 * (grossprojekt_speichern): Titel und Fundort.
 */
export const grossprojektSchema = z.object({
  titel: z.string().trim().min(1, 'pruefung.pflicht').max(500),
  quell_url: z.string().trim().min(1, 'pruefung.pflicht').max(1000),
  strasse: z.string().trim().max(200),
  plz: z
    .string()
    .trim()
    .refine((s) => s === '' || /^\d{4}$/.test(s), 'pruefung.plz'),
  gemeinde: z.string().trim().max(200),
  parzelle: z.string().trim().max(50),
  bauherr: z.string().trim().max(300),
  bauherr_art: z.enum(['', ...BAUHERR_ARTEN]),
  nutzung: z.enum(['', ...NUTZUNGEN]),
  heizung: z.enum(['', ...HEIZUNGEN]),
  heizung_jahr: zahl(2100),
  dachflaeche_m2: zahl(1_000_000),
  waermeleistung_kw: zahl(100_000),
  wohnungen: zahl(10_000),
  geschuetzt: z.boolean(),
  heizungsersatz: z.boolean(),
  notiz: z.string().trim().max(4000),
})
export type GrossprojektFormular = z.infer<typeof grossprojektSchema>
