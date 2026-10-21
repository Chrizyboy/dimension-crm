import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare und Daten des Moduls «Anfragen & Leads».
 * Dieselben Regeln gelten im Formular und vor dem Speichern. Meldungen sind i18n-Schlüssel.
 */
const frei = (max: number) => z.string().trim().max(max)

/** Neuer Lead (V233 «+ Lead»): Kontakt, Adresse des Gebäudes und Angaben zur Anfrage. */
export const leadSchema = z
  .object({
    anrede: frei(20),
    vorname: frei(80),
    nachname: frei(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((w) => w === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w), 'pruefung.email'),
    telefon: frei(40).refine((w) => w === '' || w.replace(/\D/g, '').length >= 9, 'pruefung.telefon'),
    sprache: z.enum(['de', 'fr']).nullable(),
    strasse: frei(120),
    plz: frei(10).refine((w) => w === '' || /^\d{4}$/.test(w), 'pruefung.plz'),
    ort: frei(80),
    gebaeudeart: z.string(),
    dachform: z.string(),
    quelle: z.string(),
    eingangAm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pruefung.datum'),
    standortId: z.string().nullable(),
    regionId: z.string().nullable(),
    personId: z.string().nullable(),
    interesse: z.array(z.string()),
    erreichbarkeit: z.string(),
    kommentar: frei(4000),
    notiz: frei(4000),
  })
  .refine((l) => `${l.vorname}${l.nachname}`.length >= 2, { message: 'pruefung.kontaktname', path: ['nachname'] })
  .refine((l) => l.telefon !== '' || l.email !== '', { message: 'verkauf.pruefung.erreichbar', path: ['telefon'] })
export type LeadEingabe = z.infer<typeof leadSchema>

/** Leeres Formular für einen neuen Lead; das Eingangsdatum ist heute. */
export function leererLead(heute: string): LeadEingabe {
  return {
    anrede: '',
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    sprache: null,
    strasse: '',
    plz: '',
    ort: '',
    gebaeudeart: '',
    dachform: '',
    quelle: '',
    eingangAm: heute,
    standortId: null,
    regionId: null,
    personId: null,
    interesse: ['pv'],
    erreichbarkeit: '',
    kommentar: '',
    notiz: '',
  }
}

/** Angaben beim Wechsel des Stands; was Pflicht ist, hängt vom Ziel ab (siehe `standBedarf`). */
export const standWechselSchema = z.object({
  datum: z.string(),
  grund: frei(500),
  notiz: frei(2000),
  terminDatum: z.string(),
  terminZeit: z.string(),
  dauerMin: z.number().int().min(15).max(480),
  personId: z.string(),
})
export type StandWechselEingabe = z.infer<typeof standWechselSchema>
