import { supabase } from '@/services/supabase'
import type { Aenderung, Automation, Geplant, Kennzahl, Lauf, Probelauf, Uebersicht } from '../types'

/**
 * Datenzugriff für Übersicht, Geplant, Probelauf und Änderungen (Entscheid 0041). Rechte prüft die Datenbank:
 * Übersicht, Kennzahlen, Probelauf nur Administration/GL; Läufe steuern auch die zuständige Person.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Zustand, Wirkung der letzten 7 Tage, Probleme und die nächsten 24 Stunden. */
export async function ladeUebersicht(): Promise<Uebersicht> {
  const { data, error } = await db().rpc('automation_uebersicht')
  if (error) throw error
  return data as unknown as Uebersicht
}

/** Läufe, Fehler und Zuletzt je Automation (30 Tage). */
export async function ladeKennzahlen(): Promise<Kennzahl[]> {
  const { data, error } = await db().rpc('automation_kennzahlen')
  if (error) throw error
  return data
}

/** Alle geplanten Schritte (ohne Bezug) oder die eines Datensatzes. */
export async function ladeGeplant(tabelle?: string, id?: string): Promise<Geplant[]> {
  const { data, error } = await db().rpc('automation_geplant', id ? { p_tabelle: tabelle ?? '', p_id: id } : {})
  if (error) throw error
  return data as unknown as Geplant[]
}

/** Wer hat die Automation wann geändert. */
export async function ladeAenderungen(id: string): Promise<Aenderung[]> {
  const { data, error } = await db().rpc('automation_aenderungen', { p_id: id })
  if (error) throw error
  return data
}

/** Neueste Datensätze zur Tabelle des Auslösers (für den Probelauf). */
export async function ladeProbeDatensaetze(tabelle: string): Promise<{ id: string; titel: string }[]> {
  const { data, error } = await db().rpc('automation_probe_datensaetze', { p_tabelle: tabelle })
  if (error) throw error
  return data
}

/** Rechnet die (auch ungespeicherte) Automation für einen Datensatz durch, ohne etwas anzulegen. */
export async function probelauf(
  a: Pick<Automation, 'bedingungen' | 'aktionen' | 'versandfenster'>,
  tabelle: string,
  id: string,
): Promise<Probelauf> {
  const { data, error } = await db().rpc('automation_probelauf', {
    p: { bedingungen: a.bedingungen, aktionen: a.aktionen, versandfenster: a.versandfenster } as never,
    p_tabelle: tabelle,
    p_id: id,
  })
  if (error) throw error
  return data as unknown as Probelauf
}

/** Einen fehlgeschlagenen oder übersprungenen Schritt noch einmal ausführen (nur Administration). */
export async function schrittWiederholen(lauf: string, schritt: number): Promise<void> {
  const { error } = await db().rpc('automation_schritt_wiederholen', { p_lauf: lauf, p_schritt: schritt })
  if (error) throw error
}

/** Ein Lauf mit Protokoll (für «Öffnen» aus Übersicht und Geplant). */
export async function ladeLauf(id: string): Promise<Lauf | null> {
  const { data, error } = await db()
    .from('automation_laeufe')
    .select(
      'id, automation_id, ereignis, tabelle, bezug_id, titel, stand, schritt, weiter_am, protokoll, fehler, erstellt_am, beendet_am, gestoppt_grund',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as Lauf | null
}
