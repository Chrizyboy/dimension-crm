import { z } from 'zod'

/**
 * Prüfregeln (Zod) für Formulare des Moduls «Zeiterfassung». Die Fehlertexte sind i18n-Schlüssel.
 * Dieselben Regeln prüft die Datenbank noch einmal (abwesenheit_speichern, zeit_speichern).
 */
const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'zeit.fehler.datum')
const uhrzeit = z.string().regex(/^\d{2}:\d{2}$/, 'zeit.fehler.uhrzeit')

/** Abwesenheit: Art, Zeitraum (bis nicht vor von), halber Tag, Bemerkung. */
export const abwesenheitSchema = z
  .object({
    person_id: z.string().min(1, 'zeit.fehler.person'),
    art: z.string().min(1, 'zeit.fehler.art'),
    von: datum,
    bis: datum,
    halbtag: z.boolean(),
    bemerkung: z.string().max(500),
  })
  .refine((a) => a.bis >= a.von, { message: 'zeit.fehler.bisVorVon', path: ['bis'] })

/** Zeit nachtragen: Tag, von–bis (über Mitternacht nicht), Pause, interner Posten. */
export const zeitSchema = z
  .object({
    tag: datum,
    von: uhrzeit,
    bis: uhrzeit,
    pause_min: z.number().int().min(0, 'zeit.fehler.pause').max(600, 'zeit.fehler.pause'),
    intern: z.string().min(1, 'zeit.fehler.posten'),
    notiz: z.string().max(500),
  })
  .refine((z) => z.bis > z.von, { message: 'zeit.fehler.bisVorVon', path: ['bis'] })
