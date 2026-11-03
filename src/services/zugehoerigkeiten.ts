import type { Database } from '@/types/datenbank'
import { supabase } from './supabase'

type SichtZeile = Database['public']['Views']['kontakt_zugehoerigkeiten_sicht']['Row']

/**
 * Ansprechpersonen: eine Person gehört zu einer Firma (oder als zweite Person zu einem Haushalt).
 * Gemeinsamer Dienst für Adressbuch und Kundenakte, damit beide dieselbe Tabelle gleich nutzen.
 */
export interface Zugehoerigkeit {
  id: string
  personId: string
  firmaId: string
  funktion: string | null
  hauptkontakt: boolean
  unterschreibt: boolean
  rechnungen: boolean
  vorOrt: boolean
  bevorzugt: string | null
  reihenfolge: number
  /** Direkte Nummer in dieser Firma, sonst die der Person. */
  telefon: string | null
  email: string | null
  telefonDirekt: string | null
  emailDirekt: string | null
  personName: string
  personAnrede: string | null
  personSprache: 'de' | 'fr'
  firmaName: string
  firmaArt: 'person' | 'firma'
  firmaKontaktart: string
}

/** Was sich beim Speichern ändern lässt; ohne `id` wird neu angelegt. */
export interface ZugehoerigkeitEingabe {
  id?: string
  personId: string
  firmaId: string
  funktion?: string | null
  hauptkontakt?: boolean
  unterschreibt?: boolean
  rechnungen?: boolean
  vorOrt?: boolean
  bevorzugt?: string | null
  telefonDirekt?: string | null
  emailDirekt?: string | null
  reihenfolge?: number
}

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Wandelt eine Zeile der Sicht in die App-Form (die Sicht liefert alles als «vielleicht leer»). */
export function zugehoerigkeitAusZeile(z: SichtZeile): Zugehoerigkeit {
  return {
    id: z.id ?? '',
    personId: z.person_id ?? '',
    firmaId: z.firma_id ?? '',
    funktion: z.funktion,
    hauptkontakt: z.hauptkontakt ?? false,
    unterschreibt: z.unterschreibt ?? false,
    rechnungen: z.rechnungen ?? false,
    vorOrt: z.vor_ort ?? false,
    bevorzugt: z.bevorzugt,
    reihenfolge: z.reihenfolge ?? 0,
    telefon: z.telefon,
    email: z.email,
    telefonDirekt: z.telefon_direkt,
    emailDirekt: z.email_direkt,
    personName: z.person_name ?? '–',
    personAnrede: z.person_anrede,
    personSprache: z.person_sprache === 'fr' ? 'fr' : 'de',
    firmaName: z.firma_name ?? '–',
    firmaArt: z.firma_art === 'firma' ? 'firma' : 'person',
    firmaKontaktart: z.firma_kontaktart ?? 'privat',
  }
}

/** Sortierung: Hauptkontakt zuerst, dann die gewählte Reihenfolge, dann der Name. */
export function sortiereZugehoerigkeiten(liste: Zugehoerigkeit[]): Zugehoerigkeit[] {
  return [...liste].sort(
    (a, b) =>
      Number(b.hauptkontakt) - Number(a.hauptkontakt) ||
      a.reihenfolge - b.reihenfolge ||
      a.personName.localeCompare(b.personName, 'de-CH'),
  )
}

/** Ansprechpersonen einer Firma (bzw. Personen eines Haushalts), Hauptkontakt zuerst. */
export async function ladeAnsprechpersonen(firmaId: string): Promise<Zugehoerigkeit[]> {
  const { data, error } = await db().from('kontakt_zugehoerigkeiten_sicht').select('*').eq('firma_id', firmaId)
  if (error) throw error
  return sortiereZugehoerigkeiten(data.map(zugehoerigkeitAusZeile))
}

/** Firmen, zu denen eine Person gehört (z. B. «arbeitet bei …» in ihrer Akte). */
export async function ladeFirmenEinerPerson(personId: string): Promise<Zugehoerigkeit[]> {
  const { data, error } = await db().from('kontakt_zugehoerigkeiten_sicht').select('*').eq('person_id', personId)
  if (error) throw error
  return data.map(zugehoerigkeitAusZeile).sort((a, b) => a.firmaName.localeCompare(b.firmaName, 'de-CH'))
}

/**
 * Legt eine Zugehörigkeit an oder ändert sie. Setzt man einen neuen Hauptkontakt,
 * verliert der bisherige den Merker in der Datenbank (Trigger), nicht hier.
 */
export async function speichereZugehoerigkeit(e: ZugehoerigkeitEingabe): Promise<string> {
  const zeile = {
    person_id: e.personId,
    firma_id: e.firmaId,
    ...(e.funktion !== undefined && { funktion: e.funktion?.trim() || null }),
    ...(e.hauptkontakt !== undefined && { hauptkontakt: e.hauptkontakt }),
    ...(e.unterschreibt !== undefined && { unterschreibt: e.unterschreibt }),
    ...(e.rechnungen !== undefined && { rechnungen: e.rechnungen }),
    ...(e.vorOrt !== undefined && { vor_ort: e.vorOrt }),
    ...(e.bevorzugt !== undefined && { bevorzugt: e.bevorzugt?.trim() || null }),
    ...(e.telefonDirekt !== undefined && { telefon_direkt: e.telefonDirekt?.trim() || null }),
    ...(e.emailDirekt !== undefined && { email_direkt: e.emailDirekt?.trim() || null }),
    ...(e.reihenfolge !== undefined && { reihenfolge: e.reihenfolge }),
  }
  const abfrage = e.id
    ? db().from('kontakt_zugehoerigkeiten').update(zeile).eq('id', e.id)
    : db().from('kontakt_zugehoerigkeiten').insert(zeile)
  const { data, error } = await abfrage.select('id').single()
  if (error) throw error
  return data.id
}

/** Entfernt eine Zugehörigkeit (Papierkorb, nie hart löschen; CLAUDE.md Regel 5). */
export async function entferneZugehoerigkeit(id: string): Promise<void> {
  const { error } = await db()
    .from('kontakt_zugehoerigkeiten')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
