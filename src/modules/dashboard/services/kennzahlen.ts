import { supabase } from '@/services/supabase'
import type { Betrieb, Fakt, PipelineZeile } from '../types'

/** Datenzugriff «Kennzahlen». Gezählt wird in der Datenbank-Sicht der Person (RLS), gerechnet in der App. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Alle Detail-Zeilen des Zeitraums (Leads, Offerten, Zahlungen, Fälle). */
export async function ladeFakten(von: string, bis: string): Promise<Fakt[]> {
  const { data, error } = await db().rpc('kennzahlen_fakten', { p_von: von, p_bis: bis })
  if (error) throw error
  return data as Fakt[]
}

/** Auftragsbestand, Auslastung und (mit Recht) Marge. */
export async function ladeBetrieb(von: string, bis: string): Promise<Betrieb> {
  const { data, error } = await db().rpc('kennzahlen_betrieb', { p_von: von, p_bis: bis })
  if (error) throw error
  return data as unknown as Betrieb
}

/** Einstellung «kennzahlen»: Kosten pro Lead je Quelle. */
export async function ladeQuellenKosten(): Promise<Record<string, number>> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'kennzahlen').maybeSingle()
  if (error) throw error
  const wert = data?.wert as { quellen_kosten_rappen?: Record<string, number> } | null
  return wert?.quellen_kosten_rappen ?? {}
}

/** Kosten pro Lead setzen; null entfernt sie. */
export async function setzeQuellenKosten(quelle: string, rappen: number | null): Promise<void> {
  // Die Datenbank-Funktion nimmt null als «keine Kosten»; der erzeugte Typ kennt das nicht.
  const { error } = await db().rpc('kennzahlen_quellen_kosten', { p_quelle: quelle, p_rappen: rappen as number })
  if (error) throw error
}

/** Offene Geschäfte (Lead bis unterschrieben) für «Pipeline pro Region». */
export async function ladePipeline(): Promise<PipelineZeile[]> {
  const { data, error } = await db()
    .from('verkauf_geschaefte')
    .select('id, gruppe, standort, kanton, wert_rappen, kwp')
    .in('gruppe', ['lead', 'offerte', 'offeriert', 'auftrag'])
    .limit(5000)
  if (error) throw error
  return data as PipelineZeile[]
}

/** Namen der Personen für «nach Person» und die Auslastung. */
export async function ladePersonen(): Promise<{ id: string; name: string; kuerzel: string }[]> {
  const { data, error } = await db().from('personen').select('id, name, kuerzel').is('geloescht_am', null).order('name')
  if (error) throw error
  return data
}

/** Lead-Quellen mit Namen (DE/FR) aus der Auswahlliste. */
export async function ladeQuellenNamen(): Promise<Record<string, { de: string; fr: string }>> {
  const { data, error } = await db().from('auswahlwerte').select('schluessel, text_de, text_fr').eq('liste', 'quelle')
  if (error) throw error
  return Object.fromEntries(data.map((q) => [q.schluessel, { de: q.text_de, fr: q.text_fr }]))
}
