import { supabase } from '@/services/supabase'
import type { BestellFilter, Bestellung, Position } from '../types'

/** Datenzugriff für Bestellungen. Die Regeln (Freigabe, Wareneingang, Status) liegen in der Datenbank. */
export function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Bestellungen nach Filter, neueste zuerst. */
export async function ladeBestellungen(filter: BestellFilter, projektId?: string): Promise<Bestellung[]> {
  let q = db().from('bestellungen_liste').select('*')
  if (projektId) q = q.eq('projekt_id', projektId)
  if (filter === 'offen') q = q.in('status', ['entwurf', 'freigegeben', 'bestellt', 'teilgeliefert'])
  if (filter === 'entwuerfe') q = q.in('status', ['entwurf', 'freigegeben'])
  if (filter === 'ueberfaellig') q = q.eq('ueberfaellig', true)
  if (filter === 'geliefert') q = q.eq('status', 'geliefert')
  const { data, error } = await q.order('erstellt_am', { ascending: false }).limit(1000)
  if (error) throw error
  return data as unknown as Bestellung[]
}

/** Eine Bestellung mit ihren Positionen. */
export async function ladeBestellung(id: string): Promise<{ bestellung: Bestellung; positionen: Position[] }> {
  const [b, p] = await Promise.all([
    db().from('bestellungen_liste').select('*').eq('id', id).single(),
    db()
      .from('bestellpositionen')
      .select(
        'id, bestellung_id, artikel_id, projekt_material_id, bezeichnung, artikelnummer, menge, einheit, ek_rappen, geliefert_menge, reihenfolge',
      )
      .eq('bestellung_id', id)
      .is('geloescht_am', null)
      .order('reihenfolge'),
  ])
  if (b.error) throw b.error
  if (p.error) throw p.error
  return { bestellung: b.data as unknown as Bestellung, positionen: p.data }
}

/** Neue (leere) Bestellung; Nummer B… setzt die Datenbank. Gibt die ID zurück. */
export async function bestellungAnlegen(e: {
  lieferant_id: string
  projekt_id: string | null
  lagerort_id: string | null
}): Promise<string> {
  const { data, error } = await db().from('bestellungen').insert(e).select('id').single()
  if (error) throw error
  return data.id
}

/** Liefertermin, Notiz oder (im Entwurf) Lieferant und Lieferziel ändern. */
export async function bestellungAendern(
  id: string,
  p: Partial<{ liefertermin: string | null; notiz: string | null; lieferant_id: string; lagerort_id: string | null }>,
): Promise<void> {
  const { error } = await db().from('bestellungen').update(p).eq('id', id)
  if (error) throw error
}

/** Position anlegen oder ändern (nur im Entwurf). */
export async function positionSpeichern(
  p: Omit<Position, 'id' | 'geliefert_menge' | 'projekt_material_id'> & { id?: string },
): Promise<void> {
  const { id, ...felder } = p
  const { error } = id
    ? await db().from('bestellpositionen').update(felder).eq('id', id)
    : await db().from('bestellpositionen').insert(felder)
  if (error) throw error
}

/** Position entfernen (Papierkorb, nie hart löschen). */
export async function positionEntfernen(id: string): Promise<void> {
  const { error } = await db().from('bestellpositionen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function freigeben(id: string): Promise<void> {
  const { error } = await db().rpc('bestellung_freigeben', { p_id: id })
  if (error) throw error
}

export async function zuruecknehmen(id: string): Promise<void> {
  const { error } = await db().rpc('bestellung_zuruecknehmen', { p_id: id })
  if (error) throw error
}

/** Ohne Mail bestellt (Telefon, Webshop). */
export async function alsBestellt(id: string, datum: string): Promise<void> {
  const { error } = await db().rpc('bestellung_bestellt', { p_id: id, p_datum: datum })
  if (error) throw error
}

export async function stornieren(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('bestellung_stornieren', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Wareneingang buchen; gibt den neuen Stand zurück (teilgeliefert oder geliefert). */
export async function wareneingang(id: string, datum: string, positionen: { id: string; menge: number }[]) {
  const { data, error } = await db().rpc('wareneingang_buchen', { p_id: id, p: { datum, positionen } })
  if (error) throw error
  return data
}
