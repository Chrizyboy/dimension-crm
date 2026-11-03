import { supabase } from '@/services/supabase'
import type { Tables } from '@/types/datenbank'

/** Wirft verständlich, wenn keine Datenbank verbunden ist (Vorschau). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

export type Auswahleintrag = Pick<
  Tables<'auswahlwerte'>,
  'id' | 'liste' | 'schluessel' | 'text_de' | 'text_fr' | 'reihenfolge' | 'farbe' | 'aktiv'
>

/** Alle Einträge aller Auswahllisten (auch ausgeblendete), nach Liste und Reihenfolge. */
export async function ladeAuswahlwerte(): Promise<Auswahleintrag[]> {
  const { data, error } = await db()
    .from('auswahlwerte')
    .select('id, liste, schluessel, text_de, text_fr, reihenfolge, farbe, aktiv')
    .is('geloescht_am', null)
    .order('liste')
    .order('reihenfolge')
  if (error) throw error
  return data
}

/** Ändert Texte, Farbe, Reihenfolge oder aktiv eines Eintrags. Nur Administration (RLS). */
export async function speichereAuswahlwert(
  id: string,
  aenderung: Partial<Pick<Auswahleintrag, 'text_de' | 'text_fr' | 'farbe' | 'aktiv' | 'reihenfolge'>>,
): Promise<void> {
  const { error } = await db().from('auswahlwerte').update(aenderung).eq('id', id)
  if (error) throw error
}

/** Neuer Eintrag am Ende einer Liste. Der Schlüssel bleibt danach fest, weil Daten auf ihn zeigen. */
export async function neuerAuswahlwert(
  w: Pick<Auswahleintrag, 'liste' | 'schluessel' | 'text_de' | 'text_fr' | 'reihenfolge'>,
): Promise<void> {
  const { error } = await db().from('auswahlwerte').insert(w)
  if (error) throw error
}

export type Region = Pick<Tables<'regionen'>, 'id' | 'nummer' | 'name' | 'standort_id' | 'plz_regeln'>
export type StandortVoll = Pick<Tables<'standorte'>, 'id' | 'kuerzel' | 'name' | 'strasse' | 'plz' | 'ort'>

/** Regionen (Touren) mit Standort und PLZ-Regeln. */
export async function ladeRegionenVoll(): Promise<Region[]> {
  const { data, error } = await db()
    .from('regionen')
    .select('id, nummer, name, standort_id, plz_regeln')
    .is('geloescht_am', null)
    .order('nummer')
  if (error) throw error
  return data
}

/** Speichert eine Region (neu ohne id). Nur Administration (RLS). */
export async function speichereRegion(r: Omit<Region, 'id'> & { id?: string }): Promise<void> {
  const { id, ...werte } = r
  const { error } = id
    ? await db().from('regionen').update(werte).eq('id', id)
    : await db().from('regionen').insert(werte)
  if (error) throw error
}

/** Region in den Papierkorb (bestehende Adressen behalten sie). */
export async function regionInPapierkorb(id: string): Promise<void> {
  const { error } = await db().from('regionen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Welche Region bekäme diese PLZ? Gleiche Regel wie beim Speichern einer Adresse. */
export async function regionFuerPlz(plz: string): Promise<string | null> {
  const { data, error } = await db().rpc('region_fuer_plz', { p_plz: plz })
  if (error) throw error
  return data
}

/** Standorte mit Adresse (Muri, Bulle). */
export async function ladeStandorteVoll(): Promise<StandortVoll[]> {
  const { data, error } = await db()
    .from('standorte')
    .select('id, kuerzel, name, strasse, plz, ort')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Ändert Name oder Adresse eines Standorts. Nur Administration (RLS). */
export async function speichereStandort(
  id: string,
  s: Pick<StandortVoll, 'name' | 'strasse' | 'plz' | 'ort'>,
): Promise<void> {
  const { error } = await db().from('standorte').update(s).eq('id', id)
  if (error) throw error
}

export type Protokolleintrag = Pick<
  Tables<'aenderungsprotokoll'>,
  'id' | 'tabelle' | 'datensatz' | 'aktion' | 'vorher' | 'nachher' | 'benutzer' | 'zeitpunkt'
>

/**
 * Änderungsprotokoll, neueste zuerst. Die Datenbank zeigt nur Zeilen von Tabellen, die man lesen darf.
 * @param seit nur Einträge ab diesem Zeitpunkt (ISO)
 */
export async function ladeProtokoll(f: {
  seit?: string
  tabelle?: string
  benutzer?: string
}): Promise<Protokolleintrag[]> {
  let q = db()
    .from('aenderungsprotokoll')
    .select('id, tabelle, datensatz, aktion, vorher, nachher, benutzer, zeitpunkt')
    .order('zeitpunkt', { ascending: false })
    .limit(300)
  if (f.seit) q = q.gte('zeitpunkt', f.seit)
  if (f.tabelle) q = q.eq('tabelle', f.tabelle)
  if (f.benutzer) q = q.eq('benutzer', f.benutzer)
  const { data, error } = await q
  if (error) throw error
  return data
}

export interface PapierkorbEintrag {
  tabelle: string
  id: string
  bezeichnung: string | null
  geloescht_am: string
  geloescht_von: string | null
}

/** Alles im Papierkorb, neueste zuerst (nur Administration). */
export async function ladePapierkorb(): Promise<PapierkorbEintrag[]> {
  const { data, error } = await db().rpc('papierkorb', { p_limit: 500 })
  if (error) throw error
  return data
}

/** Holt einen Datensatz aus dem Papierkorb zurück. */
export async function wiederherstellen(tabelle: string, id: string): Promise<boolean> {
  const { data, error } = await db().rpc('papierkorb_wiederherstellen', { p_tabelle: tabelle, p_id: id })
  if (error) throw error
  return data
}
