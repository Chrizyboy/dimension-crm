import type { Position } from '@/types/rechnung'
import { db } from './rechnungen'

/** Ein Rechnungsentwurf zum Erstvisum, ohne Zahlungen, Liquidität oder Marge. */
export interface VisumRechnung {
  id: string
  nummer: string | null
  art: string
  titel: string | null
  datum: string | null
  kunde: string | null
  projekt_id: string
  projekt_nummer: string | null
  projekt_titel: string | null
  positionen: Position[]
  netto_rappen: number
  mwst_rappen: number
  total_rappen: number
  visum_am: string | null
  visum_name: string | null
  visum_bemerkung: string | null
}

/** Entwürfe der eigenen Projekte (Recht «visum») bzw. alle (Recht «finanzen»), noch nicht visierte zuerst. */
export async function ladeZumVisum(): Promise<VisumRechnung[]> {
  const r = await db().rpc('rechnungen_zum_visum')
  if (r.error) throw r.error
  return r.data as unknown as VisumRechnung[]
}

/** Erstvisum geben (ohne Bemerkung) oder eine Korrektur an die Buchhaltung melden (mit Bemerkung). */
export async function visieren(id: string, bemerkung?: string): Promise<void> {
  const text = bemerkung?.trim()
  const r = await db().rpc('rechnung_visieren', text ? { p_id: id, p_bemerkung: text } : { p_id: id })
  if (r.error) throw r.error
}
