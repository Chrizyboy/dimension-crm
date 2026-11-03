import type { MahnlaufZeile, ProjektStand, Uebersicht } from '../types'
import { db } from './rechnungen'

/**
 * Übersicht der Buchhaltung, Mahnlauf und Zahlungsstand der Projekte. Was gemahnt wird und wer freigeben darf,
 * rechnet die Datenbank (mahnlauf_vorschlag, mahnung_darf_freigeben); hier wird nur geladen.
 */

/** Kennzahlen und «Heute zu tun» (Recht finanzen). */
export async function ladeUebersicht(): Promise<Uebersicht> {
  const { data, error } = await db().rpc('rechnungen_uebersicht')
  if (error) throw error
  return data as unknown as Uebersicht
}

/** Vorschlag des Mahnlaufs: Erinnerungen, Mahnungen, Übersprungenes mit Grund. */
export async function ladeMahnlauf(): Promise<MahnlaufZeile[]> {
  const { data, error } = await db().rpc('mahnlauf_vorschlag')
  if (error) throw error
  return data as unknown as MahnlaufZeile[]
}

/** Darf ich den Mahnlauf freigeben? (nur Chris, Person in den Finanz-Einstellungen) */
export async function darfMahnungFreigeben(): Promise<boolean> {
  const { data, error } = await db().rpc('mahnung_darf_freigeben')
  if (error) throw error
  return data
}

/** Zahlungsstand meiner Projekte (Projektleitung, Verkauf); mit `alle` und Recht finanzen alle laufenden. */
export async function ladeZahlungsstand(alle: boolean): Promise<ProjektStand[]> {
  const { data, error } = await db().rpc('zahlungsstand_projekte', { p_alle: alle })
  if (error) throw error
  return (data ?? []) as unknown as ProjektStand[]
}

/** Projektleiter löst die Verrechnung einer Tranche aus; die Datenbank legt den Entwurf an. Gibt die ID zurück. */
export async function verrechnenAusloesen(trancheId: string): Promise<string> {
  const { data, error } = await db().rpc('tranche_verrechnen', { p_id: trancheId })
  if (error) throw error
  return data
}
