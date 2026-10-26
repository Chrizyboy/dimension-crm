import { z } from 'zod'

const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Fahrzeug: Kennzeichen und Bezeichnung sind Pflicht; Jahrgang plausibel. */
export const fahrzeugSchema = z.object({
  kennzeichen: z.string().trim().min(2).max(20),
  bezeichnung: z.string().trim().min(1).max(80),
  jahrgang: z.number().int().min(1950).max(2100).nullable(),
  km_stand: z.number().int().min(0).nullable(),
})

/** Gerät: Art und Bezeichnung sind Pflicht; Prüfintervall 1–120 Monate oder leer. */
export const geraetSchema = z.object({
  art: z.string().min(1),
  bezeichnung: z.string().trim().min(1).max(80),
  pruef_monate: z.number().int().min(1).max(120).nullable(),
})

/**
 * Eintrag: MFK braucht die nächste MFK, Prüfung und Kalibrierung ein Ergebnis, Kilometerstand eine Zahl.
 * Dieselben Regeln prüft die Datenbank (ressource_eintrag_erfassen) noch einmal.
 */
export const eintragSchema = z
  .object({
    art: z.string().min(1),
    datum,
    km: z.number().int().min(0).nullable(),
    ergebnis: z.enum(['ok', 'maengel']).nullable(),
    naechste: datum.nullable(),
  })
  .refine((e) => e.art !== 'mfk' || e.naechste !== null, { path: ['naechste'] })
  .refine((e) => !['pruefung', 'kalibrierung'].includes(e.art) || e.ergebnis !== null, { path: ['ergebnis'] })
  .refine((e) => e.art !== 'km_stand' || e.km !== null, { path: ['km'] })
