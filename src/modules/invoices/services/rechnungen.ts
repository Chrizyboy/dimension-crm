import { abaninja } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { TablesUpdate } from '@/types/datenbank'
import type {
  Empfaenger,
  EntwurfVorgabe,
  Firma,
  OffenerRapport,
  Position,
  Rechnung,
  RechnungFilter,
  RechnungVoll,
  Tranche,
  Zahlung,
} from '../types'

/**
 * Datenzugriff für Rechnungen. Die Regeln (Nummer, Fälligkeit, fest nach dem Stellen, Mahnstufen,
 * Zahlungsstand) liegen in der Datenbank (rechnung_*), hier wird nur aufgerufen.
 */
export function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Rechnungen nach Filter, neueste zuerst. */
export async function ladeRechnungen(filter: RechnungFilter, projektId?: string): Promise<Rechnung[]> {
  let q = db().from('rechnungen_liste').select('*')
  if (projektId) q = q.eq('projekt_id', projektId)
  if (filter === 'offen') q = q.in('status', ['gestellt', 'teilbezahlt'])
  if (filter === 'ueberfaellig') q = q.eq('ueberfaellig', true)
  if (filter === 'entwuerfe') q = q.eq('status', 'entwurf')
  if (filter === 'bezahlt') q = q.eq('status', 'bezahlt')
  const { data, error } = await q
    .order('datum', { ascending: false, nullsFirst: true })
    .order('erstellt_am', { ascending: false })
    .limit(2000)
  if (error) throw error
  return data as unknown as Rechnung[]
}

const FIRMA =
  'id, kuerzel, name, strasse, plz, ort, sprache, mwst_nr, uid_nr, iban, bank, telefon, email, zahlungsfrist_tage'

/** Eine Rechnung mit Positionen, Firma, Empfänger-Adresse und Zahlungen. */
export async function ladeRechnung(id: string): Promise<RechnungVoll> {
  const [l, r, z] = await Promise.all([
    db().from('rechnungen_liste').select('*').eq('id', id).single(),
    db().from('rechnungen').select('positionen, mwst_satz, notiz, storniert_grund').eq('id', id).single(),
    db()
      .from('rechnung_zahlungen')
      .select('id, datum, betrag_rappen, quelle, notiz')
      .eq('rechnung_id', id)
      .is('geloescht_am', null)
      .order('datum'),
  ])
  if (l.error) throw l.error
  if (r.error) throw r.error
  if (z.error) throw z.error
  const liste = l.data as unknown as Rechnung
  const [f, k, o] = await Promise.all([
    db().from('firmen').select(FIRMA).eq('id', liste.firma_id).single(),
    db().from('kontakte').select('anrede, email').eq('id', liste.kontakt_id).single(),
    db()
      .from('objekte')
      .select('strasse, plz, ort')
      .eq('kontakt_id', liste.kontakt_id)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (f.error) throw f.error
  const empfaenger: Empfaenger = {
    name: liste.kunde,
    anrede: k.data?.anrede ?? null,
    email: k.data?.email ?? null,
    strasse: o.data?.strasse ?? null,
    plz: o.data?.plz ?? null,
    ort: o.data?.ort ?? null,
  }
  return {
    ...liste,
    positionen: r.data.positionen as unknown as Position[],
    mwst_satz: r.data.mwst_satz,
    notiz: r.data.notiz,
    storniert_grund: r.data.storniert_grund,
    firma_daten: f.data,
    empfaenger,
    zahlungen: z.data as Zahlung[],
  }
}

/** Tranchen aus dem Zahlungsplan ohne Rechnung, nach Fälligkeit. */
export async function ladeTranchen(): Promise<Tranche[]> {
  const { data, error } = await db()
    .from('offene_tranchen')
    .select('*')
    .order('faellig_am', { ascending: true, nullsFirst: false })
    .order('projekt_nummer')
  if (error) throw error
  return data as unknown as Tranche[]
}

/** Abgeschlossene, kostenpflichtige Rapporte ohne Rechnung. */
export async function ladeOffeneRapporte(): Promise<OffenerRapport[]> {
  const { data, error } = await db().from('offene_service_rapporte').select('*').order('datum', { ascending: false })
  if (error) throw error
  return data as unknown as OffenerRapport[]
}

/** Firmen (Standorte) mit Bank und Zahlungsfrist. */
export async function ladeFirmen(): Promise<Firma[]> {
  const { data, error } = await db().from('firmen').select(FIRMA).is('geloescht_am', null).order('kuerzel')
  if (error) throw error
  return data
}

/** Firmenangaben ändern (nur mit Recht «finanzen», prüft die Datenbank). */
export async function firmaSpeichern(id: string, p: TablesUpdate<'firmen'>): Promise<void> {
  const { error } = await db().from('firmen').update(p).eq('id', id)
  if (error) throw error
}

/** Entwurf anlegen (aus Tranche, Projekt, Rapport, Wartungsvertrag oder frei). Gibt die ID zurück. */
export async function entwurfAnlegen(v: EntwurfVorgabe): Promise<string> {
  const { data, error } = await db().rpc('rechnung_entwurf', { p: v as never })
  if (error) throw error
  return data
}

/** Entwurf ändern. */
export async function entwurfSpeichern(
  id: string,
  p: Partial<{ titel: string; positionen: Position[]; inkl_mwst: boolean; sprache: string; notiz: string | null }>,
): Promise<void> {
  const { error } = await db().rpc('rechnung_speichern', { p_id: id, p: p as never })
  if (error) throw error
}

/** Stellen: Nummer und Fälligkeit setzt die Datenbank. Gibt die Nummer zurück. */
export async function stellen(id: string, datum?: string): Promise<string> {
  const { data, error } = await db().rpc('rechnung_stellen', { p_id: id, ...(datum ? { p_datum: datum } : {}) })
  if (error) throw error
  return data
}

/** Stornieren (gestellt) oder Entwurf in den Papierkorb. */
export async function stornieren(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('rechnung_stornieren', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Nächste Mahnstufe setzen; gibt die neue Stufe zurück. */
export async function mahnen(id: string): Promise<number> {
  const { data, error } = await db().rpc('rechnung_mahnen', { p_id: id })
  if (error) throw error
  return data
}

/** Zahlung erfassen (Stand der Rechnung und Zahlungsplan rechnet die Datenbank nach). */
export async function zahlungErfassen(e: {
  rechnung_id: string
  betrag_rappen: number
  datum: string
  notiz: string | null
}): Promise<void> {
  const { error } = await db().from('rechnung_zahlungen').insert(e)
  if (error) throw error
}

/** Falsch erfasste Zahlung in den Papierkorb. */
export async function zahlungEntfernen(id: string): Promise<void> {
  const { error } = await db()
    .from('rechnung_zahlungen')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Gestellte Rechnung als Entwurf an AbaNinja. */
export const anAbaninja = (id: string) => abaninja.rechnungUebergeben(id)

/**
 * Abgleich mit AbaNinja: Rechnungen und Lieferantenrechnungen lesen (Server-Funktion) und mit dem eigenen
 * Login anwenden. Gibt die Zähler zurück (Rechnungen, neue Zahlungen, neue Lieferantenrechnungen).
 */
export async function abgleichen(): Promise<{
  rechnungen: number
  zahlungen: number
  belege_neu: number
  belege_zugeordnet: number
}> {
  const daten = await abaninja.abgleich()
  const { data, error } = await db().rpc('abaninja_abgleich_anwenden', {
    p: { rechnungen: daten.rechnungen, belege: daten.belege } as never,
  })
  if (error) throw error
  return data as never
}

/** Projekte eines Kunden für «Neue Rechnung». */
export async function ladeKundenProjekte(
  kontaktId: string,
): Promise<{ id: string; nummer: string; titel: string | null; vertragswert_rappen: number | null }[]> {
  const { data, error } = await db()
    .from('projekte')
    .select('id, nummer, titel, vertragswert_rappen')
    .eq('kontakt_id', kontaktId)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

/** Wartungsverträge eines Kunden für «Neue Rechnung». */
export async function ladeKundenWartung(
  kontaktId: string,
): Promise<{ id: string; nummer: string | null; preis_rappen: number | null; status: string }[]> {
  const { data, error } = await db()
    .from('wartungsvertraege')
    .select('id, nummer, preis_rappen, status')
    .eq('kontakt_id', kontaktId)
    .is('geloescht_am', null)
  if (error) throw error
  return data
}
