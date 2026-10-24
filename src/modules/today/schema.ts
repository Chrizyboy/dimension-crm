import { z } from 'zod'

/** Prüfregeln für «Mein Tag»: die Übersicht per Mail geht nur an eine gültige Adresse. */
export const tagMailSchema = z.object({ an: z.email() })
