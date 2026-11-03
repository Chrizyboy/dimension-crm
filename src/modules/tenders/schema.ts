import { z } from 'zod'

/**
 * Prüfregeln (Zod) für die Formulare des Ausschreibungs-Monitors. Die Datenbank prüft dieselben Regeln
 * noch einmal (Quelle Pflicht, Mail nur an Firmen …); hier geht es um schnelle Rückmeldung.
 */

const leer = z.string().trim()
const mail = z.union([z.literal(''), z.email('pruefung.email')])

/** Kontakt eines Dossiers: ohne Quelle kein Kontakt, Privatpersonen nie per Mail. */
export const kontaktSchema = z
  .object({
    rolle: z.enum(['bauherr', 'architekt', 'gu', 'planer', 'gemeinde', 'gewinner', 'vergabestelle']),
    art: z.enum(['privat', 'firma', 'gemeinde', 'behoerde']),
    name: leer.min(1, 'pruefung.pflicht'),
    firma: leer,
    email: z.string().trim().pipe(mail),
    telefon: leer,
    strasse: leer,
    plz: leer,
    ort: leer,
    sprache: z.enum(['de', 'fr']),
    quelle_link: leer.min(1, 'pruefung.pflicht'),
    notiz: leer,
  })
  .superRefine((k, ctx) => {
    if (!k.email && !k.telefon && !(k.strasse && k.plz)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'ausschreibungen.pruefung.erreichbar' })
    }
  })
export type KontaktFormular = z.infer<typeof kontaktSchema>

/** Meldung von Hand erfassen (z. B. aus dem Amtsblatt AG oder der Feuille officielle FR). */
export const erfassenSchema = z.object({
  art: z.enum(['baugesuch', 'ausschreibung', 'zuschlag', 'planermandat', 'vorankuendigung']),
  quelle: leer.min(1, 'pruefung.pflicht'),
  quell_url: leer.min(1, 'pruefung.pflicht'),
  titel: leer.min(1, 'pruefung.pflicht'),
  gemeinde: leer.min(1, 'pruefung.pflicht'),
  plz: z
    .string()
    .trim()
    .regex(/^(\d{4})?$/, 'pruefung.plz'),
  parzelle: leer,
  bauherr: leer,
  bauherr_art: z.enum(['', 'privat', 'firma', 'gemeinde', 'landwirtschaft']),
  vergabestelle: leer,
  frist: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'ausschreibungen.pruefung.datum'),
  beschreibung: leer,
})
export type ErfassenFormular = z.infer<typeof erfassenSchema>

/**
 * Entscheid mit Angaben: Grund (Pflicht bei «verwerfen»), No-Go-Grund bei «nicht teilnehmen», Datum, Form und
 * Betrag der Eingabe, Gewinner bei Absage, Grund ohne Öffnungsprotokoll, Auslöser.
 */
export const entscheidSchema = z
  .object({
    entscheid: z.string(),
    grund: leer,
    datum: leer,
    form: leer,
    ausloeser: leer,
    nogo: leer,
    betrag: z
      .string()
      .trim()
      .regex(/^([\d'’ ]+([.,]\d{1,2})?)?$/, 'ausschreibungen.pruefung.betrag'),
    gewinner: leer,
    ohne_protokoll: leer,
    /** Ob es ein Öffnungsprotokoll mit unserem Angebot gibt (sonst braucht Zuschlag/Absage einen Grund). */
    protokoll: z.boolean(),
  })
  .superRefine((e, ctx) => {
    if (['verwerfen', 'ablehnen'].includes(e.entscheid) && !e.grund) {
      ctx.addIssue({ code: 'custom', path: ['grund'], message: 'pruefung.pflicht' })
    }
    if (e.entscheid === 'nicht_teilnehmen' && !e.nogo) {
      ctx.addIssue({ code: 'custom', path: ['nogo'], message: 'pruefung.pflicht' })
    }
    if (e.entscheid === 'eingereicht' && !e.betrag) {
      ctx.addIssue({ code: 'custom', path: ['betrag'], message: 'pruefung.pflicht' })
    }
    if (['zuschlag', 'absage'].includes(e.entscheid) && !e.protokoll && !e.ohne_protokoll) {
      ctx.addIssue({ code: 'custom', path: ['ohne_protokoll'], message: 'ausschreibungen.pruefung.protokoll' })
    }
    if ((e.entscheid === 'spaeter' || (e.entscheid === 'beobachten' && e.ausloeser === 'datum')) && !e.datum) {
      ctx.addIssue({ code: 'custom', path: ['datum'], message: 'pruefung.pflicht' })
    }
    if (e.entscheid === 'eingereicht' && !e.form) {
      ctx.addIssue({ code: 'custom', path: ['form'], message: 'pruefung.pflicht' })
    }
  })
export type EntscheidFormular = z.infer<typeof entscheidSchema>
