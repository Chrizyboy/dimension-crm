import type { Reklamation } from '../lib/lagerTypen'
import { db } from './bestellungen'

/** Datenzugriff für Reklamationen beim Lieferanten. Speichern nur über `reklamation_speichern` (Recht «preise»). */

/** Reklamationen einer Bestellung, neueste zuerst. */
export async function ladeReklamationen(bestellungId: string): Promise<Reklamation[]> {
  const { data, error } = await db()
    .from('einkauf_reklamationen')
    .select(
      'id, bestellung_id, position_id, menge, grund, beschreibung, status, loesung, gemeldet_am, erledigt_am, antwort',
    )
    .eq('bestellung_id', bestellungId)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data as Reklamation[]
}

/** Reklamation anlegen oder Stand/Lösung ändern. «erledigt» braucht eine Lösung. */
export async function reklamationSpeichern(
  r: Partial<Omit<Reklamation, 'gemeldet_am' | 'erledigt_am'>> & { bestellung_id?: string },
): Promise<string> {
  const { data, error } = await db().rpc('reklamation_speichern', { p: r })
  if (error) throw error
  return data
}
