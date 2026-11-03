import { supabase } from '@/services/supabase'
import type { KartenZeile } from '../lib/kartenauszug'

/** Kartenbuchung im Abgleich: offen (kein Beleg), verbunden (Spese mit Beleg) oder erledigt (mit Grund). */
export interface KartenBuchung {
  id: string
  datum: string
  betrag_rappen: number
  text: string
  karte: string | null
  person_id: string | null
  person: string | null
  spese_id: string | null
  spese_datum: string | null
  spese_zweck: string | null
  spese_kategorie: string | null
  beleg_id: string | null
  erledigt_grund: string | null
  erledigt_von: string | null
  nachgefordert_am: string | null
  stand: 'offen' | 'verbunden' | 'erledigt'
}

/** Person für die Auswahl «Wer hat die Karte?». */
export interface KartenPerson {
  id: string
  name: string
}

/** Ergebnis von «Auszug einlesen». */
export interface Eingelesen {
  neu: number
  doppelt: number
  zugeordnet: number
}

/**
 * Datenzugriff für den Abgleich mit dem Firmenkarten-Auszug. Alles nur mit Recht «finanzen»; verbinden,
 * Person setzen, erledigen und nachfordern laufen über Datenbank-Funktionen (`firmenkarte_*`), damit die Regeln
 * (nur eindeutig verbinden, nie doppelt) an einem Ort liegen.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alle Kartenbuchungen, neueste zuerst. */
export async function ladeKartenbuchungen(): Promise<KartenBuchung[]> {
  const { data, error } = await db()
    .from('firmenkarte_abgleich')
    .select('*')
    .order('datum', { ascending: false })
    .limit(3000)
  if (error) throw error
  return data as unknown as KartenBuchung[]
}

/** Aktive Personen für die Zuordnung einer Karte. */
export async function ladeKartenPersonen(): Promise<KartenPerson[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Zeilen des Auszugs einlesen; die Datenbank überspringt schon Eingelesenes und verbindet Eindeutiges. */
export async function auszugEinlesen(zeilen: KartenZeile[], datei: string): Promise<Eingelesen> {
  const { data, error } = await db().rpc('firmenkarte_einlesen', {
    p_zeilen: zeilen as unknown as never,
    p_datei: datei,
  })
  if (error) throw error
  return data as unknown as Eingelesen
}

/** Buchung mit einer Firmenkarten-Spese verbinden oder (spese null) lösen. */
export async function buchungVerbinden(buchung: string, spese: string | null): Promise<void> {
  const { error } = await db().rpc('firmenkarte_verbinden', { p_buchung: buchung, p_spese: spese })
  if (error) throw error
}

/** Karteninhaber setzen; die Datenbank merkt sich das Kartenende für künftige Auszüge. */
export async function buchungPerson(buchung: string, person: string): Promise<void> {
  const { error } = await db().rpc('firmenkarte_person_setzen', { p_buchung: buchung, p_person: person })
  if (error) throw error
}

/** Ohne Beleg erledigen (Grund) oder mit grund null wieder öffnen. */
export async function buchungErledigen(buchung: string, grund: string | null): Promise<void> {
  const { error } = await db().rpc('firmenkarte_erledigen', { p_buchung: buchung, p_grund: grund })
  if (error) throw error
}

/** Fehlende Belege nachfordern: eine Glocke je Person. Gibt die Anzahl Personen zurück. */
export async function belegeNachfordern(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('firmenkarte_nachfordern', { p_ids: ids })
  if (error) throw error
  return data
}
