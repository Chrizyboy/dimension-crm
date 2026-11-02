import { supabase } from '@/services/supabase'
import { ordnerStatus } from '../lib/anzeige'
import type { AusgangAenderung } from '../schema'
import type { AusgangEintrag, AusgangKontext, AusgangOrdner, AusgangPruefung } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/**
 * Einträge für einen Ordner. Offene (wartet, Fehler, unterwegs) kommen alle, damit Zähler und «Für mich» aus einer
 * Abfrage stimmen; Gesendete und Verworfene die letzten 300.
 */
export async function ladeAusgang(ordner: AusgangOrdner): Promise<AusgangEintrag[]> {
  const { data, error } = await db()
    .from('ausgang_ansicht')
    .select('*')
    .in('status', ordnerStatus(ordner))
    .order('erstellt_am', { ascending: false })
    .limit(ordner === 'gesendet' || ordner === 'verworfen' ? 300 : 1000)
  if (error) throw error
  return (data as unknown as AusgangEintrag[]).map((e) => ({
    ...e,
    anhaenge: Array.isArray(e.anhaenge) ? e.anhaenge : [],
  }))
}

/** Kennzahlen der Woche für den Ordner «Gesendet». */
export async function ladeWoche(): Promise<{ gesendet: number; antworten: number; wartezeitMin: number | null }> {
  const seit = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { data, error } = await db()
    .from('ausgang_ansicht')
    .select('erstellt_am, freigegeben_am, automatisch, antwort_am')
    .eq('status', 'gesendet')
    .gte('gesendet_am', seit)
    .limit(2000)
  if (error) throw error
  const zeilen = data as {
    erstellt_am: string
    freigegeben_am: string | null
    automatisch: boolean
    antwort_am: string | null
  }[]
  // Wartezeit nur, wo ein Mensch freigegeben hat und nicht gleich beim Erstellen («Senden» im Mail-Fenster).
  const warten = zeilen
    .filter((z) => !z.automatisch && z.freigegeben_am)
    .map((z) => (new Date(z.freigegeben_am ?? z.erstellt_am).getTime() - new Date(z.erstellt_am).getTime()) / 60_000)
    .filter((m) => m > 1)
  return {
    gesendet: zeilen.length,
    antworten: zeilen.filter((z) => z.antwort_am).length,
    wartezeitMin: warten.length ? Math.round(warten.reduce((a, b) => a + b, 0) / warten.length) : null,
  }
}

/**
 * Freigeben: ein Mensch hat den Text gesehen und sagt «senden» (Regel 6). `sendeAb` plant, `wartenS` gibt Zeit für
 * «Rückgängig». Gibt die Zahl zurück.
 */
export async function freigeben(ids: string[], o: { sendeAb?: Date | null; wartenS?: number } = {}): Promise<number> {
  const { data, error } = await db().rpc('ausgang_freigeben', {
    p_ids: ids,
    ...(o.sendeAb ? { p_sende_ab: o.sendeAb.toISOString() } : {}),
    p_warten_s: o.wartenS ?? 0,
  })
  if (error) throw error
  return data
}

/** «Rückgängig»: freigegebene, noch nicht gesendete Einträge warten wieder. */
export async function zurueckholen(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('ausgang_zurueckholen', { p_ids: ids })
  if (error) throw error
  return data
}

/** Sendezeit setzen (null = sofort). */
export async function planen(ids: string[], sendeAb: Date | null): Promise<void> {
  const { error } = await db().rpc('ausgang_planen', {
    p_ids: ids,
    ...(sendeAb ? { p_sende_ab: sendeAb.toISOString() } : { p_sende_ab: null as unknown as string }),
  })
  if (error) throw error
}

/** Nicht senden (mit Grund). */
export async function verwerfen(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('ausgang_verwerfen', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** «Zurück an …» mit Notiz (Standard: wer den Eintrag vorbereitet hat). */
export async function zurueckAn(id: string, notiz: string): Promise<void> {
  const { error } = await db().rpc('ausgang_zurueck', { p_id: id, p_notiz: notiz })
  if (error) throw error
}

/** Brief versendet oder Mail in Outlook «Gesendet» gefunden. */
export async function alsGesendet(id: string): Promise<void> {
  const { error } = await db().rpc('ausgang_als_gesendet', { p_id: id })
  if (error) throw error
}

/** Brief: Rücklauf erhalten. */
export async function ruecklauf(id: string, zurueck = true): Promise<void> {
  const { error } = await db().rpc('ausgang_ruecklauf', { p_id: id, p_zurueck: zurueck })
  if (error) throw error
}

/** Absender auf mich wechseln (Mail geht aus meinem Outlook). */
export async function absenderIch(id: string): Promise<void> {
  const { error } = await db().rpc('ausgang_absender_ich', { p_id: id })
  if (error) throw error
}

/** Empfänger oder Text vor der Freigabe ändern. */
export async function aendern(id: string, w: AusgangAenderung): Promise<void> {
  const { error } = await db().rpc('ausgang_aendern', {
    p_id: id,
    p: { an: w.an, cc: w.cc, betreff: w.betreff, text: w.text },
  })
  if (error) throw error
}

/** Prüfungen vor dem Senden. */
export async function pruefen(id: string): Promise<AusgangPruefung[]> {
  const { data, error } = await db().rpc('ausgang_pruefen', { p_id: id })
  if (error) throw error
  return (data as unknown as AusgangPruefung[] | null) ?? []
}

/** Kunde, Lead, Offerte, Projekt, Rechnung und letzte Nachrichten zum Eintrag. */
export async function kontext(id: string): Promise<AusgangKontext | null> {
  const { data, error } = await db().rpc('ausgang_kontext', { p_id: id })
  if (error) throw error
  return data as unknown as AusgangKontext | null
}
