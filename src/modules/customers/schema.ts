import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare und Daten des Moduls «Kunden».
 * Dieselben Regeln gelten im Formular und vor dem Speichern. Meldungen sind i18n-Schlüssel.
 */
const frei = (max: number) => z.string().trim().max(max)

/** Kontakt erfassen oder ändern. Die Adresse landet beim Anlegen im ersten Gebäude (Objekt). */
export const kontaktSchema = z
  .object({
    art: z.enum(['person', 'firma']),
    kontaktart: z.string().min(1),
    anrede: frei(20),
    vorname: frei(80),
    nachname: frei(80),
    firma: frei(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((w) => w === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w), 'pruefung.email'),
    telefon: frei(40).refine((w) => w === '' || w.replace(/\D/g, '').length >= 9, 'pruefung.telefon'),
    sprache: z.enum(['de', 'fr']),
    werbesperre: z.boolean(),
    notiz: frei(4000),
    strasse: frei(120),
    plz: frei(10).refine((w) => w === '' || /^\d{4}$/.test(w), 'pruefung.plz'),
    ort: frei(80),
  })
  .refine((k) => (k.art === 'firma' ? k.firma.length >= 2 : `${k.vorname}${k.nachname}`.length >= 2), {
    message: 'pruefung.kontaktname',
    path: ['nachname'],
  })
export type KontaktEingabe = z.infer<typeof kontaktSchema>

/** Leeres Formular für einen neuen Kontakt. */
export const LEERER_KONTAKT: KontaktEingabe = {
  art: 'person',
  kontaktart: 'privat',
  anrede: '',
  vorname: '',
  nachname: '',
  firma: '',
  email: '',
  telefon: '',
  sprache: 'de',
  werbesperre: false,
  notiz: '',
  strasse: '',
  plz: '',
  ort: '',
}

/** Kontakt erfassen (V233 «Kontakt erfassen als Aktivität»): Anruf, Mail, Besuch, Notiz … */
export const aktivitaetSchema = z.object({
  art: z.string().min(1),
  richtung: z.enum(['ein', 'aus']).nullable(),
  text: z.string().trim().min(1, 'pruefung.text').max(8000),
  /** Ergebnis eines Kontaktversuchs: nicht erreicht, Combox, Rückruf … (V233) */
  ergebnis: z.string().nullable(),
})
export type AktivitaetEingabe = z.infer<typeof aktivitaetSchema>

/** Gebäude (Objekt) mit Adresse und den Angaben aus der Besichtigung. */
export const objektSchema = z.object({
  strasse: frei(120),
  plz: frei(10).refine((w) => w === '' || /^\d{4}$/.test(w), 'pruefung.plz'),
  ort: frei(80).min(1, 'pruefung.ort'),
  gebaeudeart: z.string().nullable(),
  dachform: z.string().nullable(),
  eigentum: z.string().nullable(),
  verbrauch_kwh: z.number().int().min(0).max(10_000_000).nullable(),
  netzbetreiber: frei(120),
  gemeinde: frei(80),
})
export type ObjektEingabe = z.infer<typeof objektSchema>
