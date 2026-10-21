import { dokumentAdresse } from '@/services/dokumente'

/** Sprachen der Datenblätter (V87): Deutsch, Französisch, Englisch. */
export const DATENBLATT_SPRACHEN = ['de', 'fr', 'en'] as const

/**
 * Adresse eines Datenblatts: ein Link des Herstellers oder eine abgelegte Datei («dokumente:pfad»),
 * die einen kurz gültigen Link bekommt, damit der Speicher privat bleibt.
 */
export async function datenblattAdresse(wert: string): Promise<string | null> {
  if (wert.startsWith('dokumente:'))
    return dokumentAdresse({ sharepoint_url: null, speicher_pfad: wert.slice('dokumente:'.length) })
  return /^https?:\/\//.test(wert) ? wert : null
}
