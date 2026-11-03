import type { Json } from '@/types/datenbank'
import type { KursEingabe, KursJahr, TeamPerson } from '../types'
import { db } from './personal'

/**
 * Team-Übersicht und Kurse. Wer was sieht und darf (Grund einer Abwesenheit, Kosten, bewilligen bis zur Grenze),
 * entscheidet die Datenbank; die App zeigt nur, was zurückkommt.
 */

/** Alle aktiven Personen mit Kontakt, Vorgesetzt und was sie heute tun. */
export async function ladeTeamUebersicht(): Promise<TeamPerson[]> {
  const { data, error } = await db().rpc('team_uebersicht', {})
  if (error) throw error
  return data as unknown as TeamPerson[]
}

/** Kurse eines Jahres mit Budget. */
export async function ladeKurse(jahr: number): Promise<KursJahr> {
  const { data, error } = await db().rpc('team_kurse', { p_jahr: jahr })
  if (error) throw error
  return data as unknown as KursJahr
}

/** Kurs anlegen (id null) oder ändern; gibt die id zurück. Ohne Recht wird daraus ein Antrag. */
export async function kursSpeichern(id: string | null, k: KursEingabe): Promise<string> {
  const { data, error } = await db().rpc('kurs_speichern', { p_id: id, p: k as unknown as Json })
  if (error) throw error
  return data
}

/** Antrag bewilligen, oder ablehnen/absagen mit Grund. */
export async function kursEntscheiden(id: string, bewilligt: boolean, grund?: string): Promise<void> {
  const { error } = await db().rpc('kurs_entscheiden', {
    p_id: id,
    p_bewilligt: bewilligt,
    ...(grund ? { p_grund: grund } : {}),
  })
  if (error) throw error
}

/** Kurs abschliessen: wer dabei war, bekommt den Ausweis. Gibt die Zahl neuer Ausweise zurück. */
export async function kursBesucht(id: string, personen: string[]): Promise<number> {
  const { data, error } = await db().rpc('kurs_besucht', { p_id: id, p_personen: personen })
  if (error) throw error
  return data
}

/** Pflicht je Rolle, Gültigkeit und Text einer Ausweis-Art speichern (neue Art, wenn der Schlüssel fehlt). */
export async function anforderungSpeichern(
  schluessel: string,
  a: { pflicht_fuer: string[]; gueltig_monate: number | null; text_de?: string; text_fr?: string },
): Promise<void> {
  const { error } = await db().rpc('ausweis_anforderung_speichern', { p_schluessel: schluessel, p: a as Json })
  if (error) throw error
}
