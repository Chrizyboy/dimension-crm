import type { AkteDaten, Lohn, PersonalAkte } from '../types'
import { db, dateiHochladen } from './personal'

/** Felder, die das Recht «personal» ändert; die Datenbank setzt sie für alle anderen zurück. */
export type AkteFelder = Omit<PersonalAkte, 'id'>

/**
 * Personal-Akte einer Person, so viel die angemeldete Person sehen darf (Prüfung in der Datenbank).
 * null, wenn sie nichts davon sehen darf.
 */
export async function ladeAkte(personId: string): Promise<AkteDaten | null> {
  const { data, error } = await db().rpc('personal_akte', { p_person: personId })
  if (error) throw error
  if (!data) return null
  const { sicht, vorgesetzt_name, loehne, gespraeche, dokumente, ausruestung, ...akte } = data as Record<
    string,
    unknown
  >
  return {
    sicht: sicht as AkteDaten['sicht'],
    akte: akte as unknown as PersonalAkte,
    vorgesetztName: (vorgesetzt_name as string | null) ?? null,
    loehne: (loehne as Lohn[] | null) ?? null,
    gespraeche: (gespraeche as AkteDaten['gespraeche'] | null) ?? [],
    dokumente: (dokumente as AkteDaten['dokumente'] | null) ?? [],
    ausruestung: (ausruestung as string[] | null) ?? [],
  }
}

/** Akte speichern: anlegen beim ersten Mal, sonst ändern. Geschützte Felder hält die Datenbank ein. */
export async function akteSpeichern(a: Partial<AkteFelder> & { person_id: string }, id: string | null): Promise<void> {
  const { error } = id
    ? await db().from('personal_akten').update(a).eq('id', id)
    : await db().from('personal_akten').insert(a)
  if (error) throw error
}

/** Lohn erfassen oder ändern (nur Recht «personal»). */
export async function lohnSpeichern(l: Omit<Lohn, 'id'> & { person_id: string }, id?: string): Promise<void> {
  const { error } = id
    ? await db().from('personal_loehne').update(l).eq('id', id)
    : await db().from('personal_loehne').insert(l)
  if (error) throw error
}

/** Gespräch erfassen oder ändern; setzt das nächste Gespräch in der Akte (Frist mit Glocke). */
export async function gespraechSpeichern(g: {
  person_id: string
  datum: string
  art: string
  notiz: string | null
  naechstes: string | null
  id?: string
}): Promise<void> {
  const { error } = await db().rpc('personal_gespraech_speichern', {
    p_person: g.person_id,
    p_datum: g.datum,
    p_art: g.art,
    ...(g.notiz ? { p_notiz: g.notiz } : {}),
    ...(g.naechstes ? { p_naechstes: g.naechstes } : {}),
    ...(g.id ? { p_id: g.id } : {}),
  })
  if (error) throw error
}

/** Dokument hochladen (Ordner = Person) und in der Akte eintragen. */
export async function dokumentHochladen(d: {
  person_id: string
  art: string
  titel: string
  datum: string | null
  datei: File
}): Promise<void> {
  const pfad = await dateiHochladen(d.person_id, d.datei)
  const { error } = await db()
    .from('personal_dokumente')
    .insert({ person_id: d.person_id, art: d.art, titel: d.titel, datum: d.datum, datei_pfad: pfad })
  if (error) throw error
}

/** Lohn, Gespräch oder Dokument in den Papierkorb (nichts wird hart gelöscht). */
export async function eintragEntfernen(
  tabelle: 'personal_loehne' | 'personal_gespraeche' | 'personal_dokumente',
  id: string,
): Promise<void> {
  const { error } = await db().from(tabelle).update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
