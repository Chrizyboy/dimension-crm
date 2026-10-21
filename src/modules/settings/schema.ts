import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare und Daten des Moduls «Einstellungen».
 * Dieselben Regeln gelten im Formular und vor dem Speichern. Meldungen sind i18n-Schlüssel.
 */
export const settingsSchema = z.object({})

/** Neue Person einladen. */
export const einladungSchema = z.object({
  name: z.string().trim().min(2, 'pruefung.name'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'pruefung.email'),
  rolle: z.string().min(1, 'pruefung.rolle'),
  standort_id: z.string().nullable(),
  sprache: z.enum(['de', 'fr']),
})
export type EinladungEingabe = z.infer<typeof einladungSchema>

/** Felder aus «Mein Konto», wie in der Vorlage (V181). Alle freiwillig. */
export const kontoSchema = z.object({
  position: z.string().trim().max(80),
  funktion: z.string().trim().max(120),
  pensum: z.string().trim().max(20),
  tage: z.string().trim().max(80),
  direkt: z.string().trim().max(30),
  mobil: z.string().trim().max(30),
  sprachen: z.string().trim().max(80),
  strasse: z.string().trim().max(120),
  plz: z
    .string()
    .trim()
    .regex(/^(\d{4})?$/, 'pruefung.plz'),
  ort: z.string().trim().max(80),
  notfallName: z.string().trim().max(80),
  notfallTel: z.string().trim().max(30),
  routeStart: z.string().trim().max(160),
})
export type KontoEingabe = z.infer<typeof kontoSchema>

/** Leeres Profil, damit jedes Feld im Formular einen Wert hat. */
export const LEERES_KONTO: KontoEingabe = {
  position: '',
  funktion: '',
  pensum: '',
  tage: '',
  direkt: '',
  mobil: '',
  sprachen: '',
  strasse: '',
  plz: '',
  ort: '',
  notfallName: '',
  notfallTel: '',
  routeStart: '',
}

/** Liest das gespeicherte Profil (jsonb, aus der Vorlage übernommen) in Formularwerte. */
export function kontoAusProfil(profil: unknown): KontoEingabe {
  const p = profil && typeof profil === 'object' ? (profil as Record<string, unknown>) : {}
  const werte = { ...LEERES_KONTO }
  for (const k of Object.keys(werte) as (keyof KontoEingabe)[]) {
    const v = p[k]
    if (typeof v === 'string' || typeof v === 'number') werte[k] = String(v)
  }
  return werte
}

/**
 * Macht aus den Zod-Fehlern ein Objekt «Feld → übersetzter Text» für die Formulare.
 * Die Meldungen im Schema sind i18n-Schlüssel, darum wird hier übersetzt.
 */
export function feldFehler<T extends string>(
  issues: readonly z.core.$ZodIssue[],
  t: (schluessel: string) => string,
): Partial<Record<T, string>> {
  const fehler: Partial<Record<string, string>> = {}
  for (const i of issues) {
    const feld = i.path[0]
    if (typeof feld === 'string' && !fehler[feld]) fehler[feld] = t(i.message)
  }
  return fehler
}
