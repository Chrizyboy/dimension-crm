import { herunterladen } from '@/lib/datei'
import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { BetriebStand, Sicherung, Wiederherstellung } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Sicherungen der letzten Zeit, neuste zuerst (nur Administration; die Datenbank prüft das Recht). */
export async function ladeSicherungen(): Promise<Sicherung[]> {
  const { data, error } = await db()
    .from('sicherungen')
    .select(
      'id, slot, art, status, von_name, begonnen_am, fertig_am, bytes, pfad, fehler, anzahl, sharepoint, wiederhergestellt_am, wiederhergestellt_von',
    )
    .order('begonnen_am', { ascending: false })
    .limit(60)
  if (error) throw error
  return data as Sicherung[]
}

/** Stunden der automatischen Sicherung aus der Einstellung «sicherung» (Standard 12 und 16 Uhr wie V233). */
export async function ladeSicherungsStunden(): Promise<number[]> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'sicherung').maybeSingle()
  if (error) throw error
  const stunden = (data?.wert as { stunden?: number[] } | null)?.stunden
  return Array.isArray(stunden) && stunden.length ? stunden : [12, 16]
}

/** «Jetzt sichern» auf dem Server. */
export function sichereJetzt(): Promise<{ id: string; zeilen: number; bytes: number }> {
  return rufeFunktion('sicherung', 'erstellen')
}

/** Sicherung wiederherstellen; der Server sichert vorher den jetzigen Stand. */
export async function stelleWiederHer(id: string): Promise<Wiederherstellung> {
  const r = await rufeFunktion<{ anzahl: Wiederherstellung }>('sicherung', 'wiederherstellen', { id, bestaetigt: true })
  return r.anzahl
}

/** Datei herunterladen (Speicher «sicherungen», nur für die Administration lesbar). */
export async function ladeSicherungHerunter(s: Pick<Sicherung, 'pfad'>): Promise<void> {
  if (!s.pfad) throw new Error('sicherung_fehlt')
  const { data, error } = await db().storage.from('sicherungen').download(s.pfad)
  if (error) throw error
  herunterladen(data, s.pfad, 'application/gzip')
}

/** Stand des Betriebs: Zeitplan, Sicherung, Personen, Daten (nur Administration). */
export async function ladeBetrieb(): Promise<BetriebStand> {
  const { data, error } = await db().rpc('betrieb_stand')
  if (error) throw error
  return data as unknown as BetriebStand
}
