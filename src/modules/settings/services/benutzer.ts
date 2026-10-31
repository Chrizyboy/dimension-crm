import { supabase } from '@/services/supabase'
import type { EinladungEingabe, KontoEingabe } from '../schema'
import type { Einladung, Einladungsergebnis, Person, Personenstatus, Rolle, Standort } from '../types'

/** Wirft verständlich, wenn keine Datenbank verbunden ist (Vorschau). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alle Personen im Team, aktive zuerst, dann nach Name. Gelöschte (Papierkorb) nicht. */
export async function ladePersonen(): Promise<Person[]> {
  const { data, error } = await db()
    .from('personen')
    .select(
      'id, kuerzel, name, email, rolle, rechte, bereiche, aktiv, sprache, standort_id, zuletzt_aktiv, auth_user_id, profil',
    )
    .is('geloescht_am', null)
    .order('aktiv', { ascending: false })
    .order('name')
  if (error) throw error
  return data
}

/** Rollen in der festgelegten Reihenfolge. */
export async function ladeRollen(): Promise<Rolle[]> {
  const { data, error } = await db()
    .from('rollen')
    .select(
      'id, schluessel, name_de, name_fr, beschreibung_de, beschreibung_fr, rechte, bereiche, reihenfolge, ansicht',
    )
    .is('geloescht_am', null)
    .eq('aktiv', true)
    .order('reihenfolge')
  if (error) throw error
  return data
}

/** Standorte Muri und Bulle. */
export async function ladeStandorte(): Promise<Standort[]> {
  const { data, error } = await db()
    .from('standorte')
    .select('id, kuerzel, name')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Einladungen (nur für Admins lesbar, sonst leer). */
export async function ladeEinladungen(): Promise<Einladung[]> {
  const { data, error } = await db()
    .from('einladungen')
    .select('id, email, gueltig_bis, verwendet_am, widerrufen_am, erstellt_am')
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

/** Leitet den Stand einer Person ab (für das Abzeichen in der Liste). */
export function statusVon(person: Person, einladungen: Einladung[], jetzt = new Date()): Personenstatus {
  if (!person.aktiv) return 'deaktiviert'
  if (person.zuletzt_aktiv) return 'aktiv'
  const offen = einladungen.some(
    (e) =>
      e.email === person.email &&
      !e.verwendet_am &&
      !e.widerrufen_am &&
      (!e.gueltig_bis || new Date(e.gueltig_bis) > jetzt),
  )
  return offen ? 'eingeladen' : 'bereit'
}

/** Ändert Rolle, Zusatzrechte, Bereiche, Standort oder aktiv. Nur Admins (RLS). */
export async function speicherePerson(
  id: string,
  aenderung: Partial<Pick<Person, 'name' | 'rolle' | 'rechte' | 'bereiche' | 'standort_id' | 'aktiv' | 'sprache'>>,
): Promise<void> {
  const { error } = await db().from('personen').update(aenderung).eq('id', id)
  if (error) throw error
}

/** Ändert Rechte, Bereiche und Ansicht (voll/einfach) einer Rolle. Nur Admins (RLS). */
export async function speichereRolle(
  id: string,
  aenderung: Partial<Pick<Rolle, 'rechte' | 'bereiche' | 'ansicht'>>,
): Promise<void> {
  const { error } = await db().from('rollen').update(aenderung).eq('id', id)
  if (error) throw error
}

/**
 * Lädt eine Person ein: legt sie an (falls neu) und schickt die Einladungs-Mail.
 * Läuft über die Server-Funktion «einladen», weil dafür der geheime Schlüssel nötig ist.
 */
export async function ladeEin(eingabe: EinladungEingabe): Promise<Einladungsergebnis> {
  const antwort = await db().functions.invoke<Einladungsergebnis>('einladen', { body: eingabe })
  if (antwort.error !== null) throw antwort.error as Error
  return antwort.data ?? { ok: false }
}

/** Speichert das eigene Profil («Mein Konto»). Rolle und Rechte kann man hier nicht ändern. */
export async function speichereMeinKonto(
  profil: KontoEingabe,
  weitere: { sprache?: 'de' | 'fr'; darstellung?: string; standort_id?: string | null },
): Promise<void> {
  const { error } = await db().rpc('aendere_mein_konto', {
    p_profil: profil,
    ...(weitere.sprache ? { p_sprache: weitere.sprache } : {}),
    ...(weitere.darstellung ? { p_darstellung: weitere.darstellung } : {}),
    ...(weitere.standort_id ? { p_standort_id: weitere.standort_id } : {}),
  })
  if (error) throw error
}
