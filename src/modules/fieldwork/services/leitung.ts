import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Auswertung,
  BaustelleZeile,
  BaustellenAkte,
  BaustellenEinstellung,
  BaustellenInfo,
  Heute,
  Mappe,
  MeldungZeile,
  Wochenblatt,
} from '../types'
import { db } from './baustelle'

/**
 * Datenzugriff für den Ausbau (Entscheid 0039): Baustellen heute, Akte, Mappe, Wochenblatt, Auswertung, Meldungen.
 * Die Funktionen sind neu in der Datenbank; die erzeugten Typen (`npm run db:typen`) folgen mit dem nächsten
 * Lauf an der lokalen Datenbank. Bis dahin ruft dieser Baustein sie ohne Typprüfung der Namen auf, damit die
 * parallel laufenden Module nicht alle an derselben erzeugten Datei ändern.
 */
async function rufe<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (db() as unknown as SupabaseClient).rpc(name, args)
  if (error) throw error
  return data as T
}

/** Zusätze je Einsatz für den Tagesplan am Handy. */
export const ladeInfos = (einsaetze: string[]) =>
  einsaetze.length === 0
    ? Promise.resolve({} as Record<string, BaustellenInfo>)
    : rufe<Record<string, BaustellenInfo>>('baustellen_infos', { p_einsaetze: einsaetze })

/** Baustellen-Mappe eines Projekts. */
export const ladeMappe = (projekt: string) => rufe<Mappe | null>('baustellen_mappe', { p_projekt: projekt })

/** «Baustellen heute» für die Projektleitung. */
export const ladeHeute = (tag?: string) => rufe<Heute>('baustellen_heute', tag ? { p_tag: tag } : {})

/** Baustellen der letzten und nächsten Wochen. */
export const ladeBaustellen = (tage = 45) => rufe<BaustelleZeile[]>('baustellen_liste', { p_tage: tage })

/** Alles zu einer Baustelle. */
export const ladeAkte = (projekt: string) => rufe<BaustellenAkte | null>('baustelle_akte', { p_projekt: projekt })

/** Wochenblatt der Zeiten (Montag). */
export const ladeWochenblatt = (montag: string) => rufe<Wochenblatt>('zeiten_wochenblatt', { p_montag: montag })

/** Auswertung für die GL. */
export const ladeAuswertung = (von: string, bis: string) =>
  rufe<Auswertung>('baustelle_auswertung', { p_von: von, p_bis: bis })

/** Rapport visieren oder mit Rückfrage an den Monteur zurück. */
export const rapportVisieren = (id: string, rueckfrage?: string) =>
  rufe<null>('rapport_visieren', { p_id: id, ...(rueckfrage ? { p_rueckfrage: rueckfrage } : {}) })

/** Meldung erledigen (mit Notiz) oder wieder öffnen. */
export const meldungErledigen = (id: string, notiz?: string, wieder = false) =>
  rufe<null>('meldung_erledigen', { p_id: id, p_notiz: notiz ?? null, p_wieder: wieder })

/** Soll-Stunden von Hand setzen (null = Faustregel). */
export const sollSetzen = (projekt: string, stunden: number | null) =>
  rufe<null>('baustelle_soll_setzen', { p_projekt: projekt, p_stunden: stunden })

/** Eigene Woche bestätigen. */
export const wocheBestaetigen = (montag: string) => rufe<null>('zeiten_woche_bestaetigen', { p_woche: montag })

/** Meldungen (offene oder alle der letzten 90 Tage). */
export async function ladeMeldungen(nurOffen: boolean): Promise<MeldungZeile[]> {
  let q = (db() as unknown as SupabaseClient).from('baustellen_meldungen_liste').select('*')
  q = nurOffen ? q.is('erledigt_am', null) : q.gte('erstellt_am', new Date(Date.now() - 90 * 86_400_000).toISOString())
  const { data, error } = await q.order('erstellt_am', { ascending: false }).limit(300)
  if (error) throw error
  return data as MeldungZeile[]
}

/** Sicherheits-Check und Zeit-Regeln aus `einstellungen.baustelle`. */
export async function ladeEinstellung(): Promise<BaustellenEinstellung> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'baustelle').maybeSingle()
  if (error) throw error
  return (data?.wert ?? { sicherheit: [] }) as unknown as BaustellenEinstellung
}
