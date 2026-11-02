import type { Bedarf, BestellMail, LieferantKennzahl, PlanZeile, RechnungVorschlag } from '../types'
import { db } from './bestellungen'

/**
 * Datenzugriff für Leitstand, Materialplan, Sammelbestellung, Auftragsbestätigung und Rechnungsabgleich
 * (Entscheid 0039). Die Regeln (Freigabegrenze, Runden auf VE, Abweichungen) liegen in der Datenbank.
 */

/** Offener Bedarf aller Projekte und des Lagers, je mit günstigstem Lieferanten. */
export async function ladeBedarf(): Promise<Bedarf[]> {
  const { data, error } = await db()
    .from('einkauf_bedarf')
    .select('*')
    .order('bestellen_bis', { nullsFirst: false })
    .limit(5000)
  if (error) throw error
  return data as unknown as Bedarf[]
}

/** Offene Projekte mit Deckung, Bestellen-bis und Gefahr für die Montage. */
export async function ladeMaterialplan(): Promise<PlanZeile[]> {
  const { data, error } = await db()
    .from('materialplan')
    .select('*')
    .order('baubeginn', { nullsFirst: false })
    .order('nummer')
    .limit(2000)
  if (error) throw error
  return data as unknown as PlanZeile[]
}

/** Den Bedarf in Entwürfe legen (alle Lieferanten oder einer). */
export async function sammelbestellung(
  lieferantId: string | null,
): Promise<{ reserviert: number; bestellungen: string[]; ohne_lieferant: number }> {
  const { data, error } = await db().rpc('sammelbestellung', lieferantId ? { p_lieferant: lieferantId } : {})
  if (error) throw error
  return data as unknown as { reserviert: number; bestellungen: string[]; ohne_lieferant: number }
}

/** Kennzahlen aller Lieferanten. */
export async function ladeKennzahlen(): Promise<Map<string, LieferantKennzahl>> {
  const { data, error } = await db().from('lieferanten_kennzahlen').select('*')
  if (error) throw error
  return new Map((data as unknown as LieferantKennzahl[]).map((k) => [k.id, k]))
}

/** Darf ich diesen Betrag selbst freigeben? (unter der Grenze oder Freigebende Person) */
export async function darfFreigeben(totalRappen: number | null): Promise<boolean> {
  const { data, error } = await db().rpc('einkauf_darf_freigeben', { p_total_rappen: totalRappen ?? 0 })
  if (error) throw error
  return Boolean(data)
}

/** Entwurf zur Freigabe vorlegen (Glocke an die Freigebenden). */
export async function vorlegen(id: string): Promise<void> {
  const { error } = await db().rpc('bestellung_vorlegen', { p_id: id })
  if (error) throw error
}

/** Angaben einer Auftragsbestätigung. */
export interface AbAngaben {
  nummer: string
  datum: string | null
  termin: string | null
  total_rappen: number | null
  positionen: { id: string; menge: number | null; ek_rappen: number | null }[]
}

/** Auftragsbestätigung speichern; gibt die Zahl der Abweichungen zurück. */
export async function abErfassen(id: string, ab: AbAngaben): Promise<number> {
  const { data, error } = await db().rpc('bestellung_ab_erfassen', { p_id: id, p: ab as never })
  if (error) throw error
  return data
}

/** Passende Lieferantenrechnungen aus AbaNinja. */
export async function ladeRechnungen(id: string): Promise<RechnungVorschlag[]> {
  const { data, error } = await db().rpc('bestellung_rechnungen', { p_id: id })
  if (error) throw error
  return data as unknown as RechnungVorschlag[]
}

/** Lieferantenrechnung zuordnen und auf Wunsch als geprüft markieren. */
export async function rechnungSpeichern(
  id: string,
  p: { kreditor_id?: string; nummer?: string; betrag_rappen?: number; notiz?: string; geprueft: boolean },
): Promise<void> {
  const { error } = await db().rpc('bestellung_rechnung', { p_id: id, p })
  if (error) throw error
}

/** Mails im Posteingang zur Bestellung (Nummer oder Absender-Domain des Lieferanten). */
export async function ladeMails(id: string): Promise<BestellMail[]> {
  const { data, error } = await db().rpc('bestellung_mails', { p_id: id })
  if (error) throw error
  return data as unknown as BestellMail[]
}
