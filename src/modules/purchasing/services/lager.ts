import type { LagerArt, Lagerort, LagerZeile, Lieferant } from '../types'
import { db } from './bestellungen'

/** Datenzugriff für Lager und Lieferanten. Buchungen laufen über `lager_buchen` (mit Bewegung). */

/** Bestand aller Lagerorte. */
export async function ladeLager(): Promise<LagerZeile[]> {
  const { data, error } = await db().from('lager_uebersicht').select('*').order('artikel')
  if (error) throw error
  return data as unknown as LagerZeile[]
}

/** Aktive Lagerorte (heute nur Bulle). */
export async function ladeLagerorte(): Promise<Lagerort[]> {
  const { data, error } = await db()
    .from('lagerorte')
    .select('id, name, adresse')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Lager buchen: Eingang, Korrektur, Inventur, Reservierung, Freigabe oder Entnahme. */
export async function lagerBuchen(p: {
  art: LagerArt
  lagerort_id: string
  artikel_id: string
  menge: number
  projekt_material_id?: string
  notiz?: string
}): Promise<void> {
  const { error } = await db().rpc('lager_buchen', { p })
  if (error) throw error
}

/** Mindestmenge setzen (leer = keine Warnung). */
export async function mindestmengeSetzen(id: string, menge: number | null): Promise<void> {
  const { error } = await db().from('lagerbestand').update({ mindestmenge: menge }).eq('id', id)
  if (error) throw error
}

/** Artikel unter Mindestmenge als Entwürfe bestellen. */
export async function nachbestellen(lagerortId: string): Promise<{ bestellungen: string[]; ohne_lieferant: number }> {
  const { data, error } = await db().rpc('lager_nachbestellen', { p_lagerort: lagerortId })
  if (error) throw error
  return data as unknown as { bestellungen: string[]; ohne_lieferant: number }
}

/** Lieferanten (aktive zuerst). */
export async function ladeLieferanten(): Promise<Lieferant[]> {
  const { data, error } = await db()
    .from('lieferanten')
    .select('id, name, email_bestellung, kundennummer_bei_lieferant, telefon, sprache, aktiv, notiz')
    .is('geloescht_am', null)
    .order('aktiv', { ascending: false })
    .order('name')
  if (error) throw error
  return data as Lieferant[]
}

/** Lieferant anlegen oder ändern. */
export async function lieferantSpeichern(l: Omit<Lieferant, 'id'> & { id?: string }): Promise<void> {
  const { id, ...felder } = l
  const { error } = id
    ? await db().from('lieferanten').update(felder).eq('id', id)
    : await db().from('lieferanten').insert(felder)
  if (error) throw error
}
