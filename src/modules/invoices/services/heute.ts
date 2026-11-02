import { db } from './rechnungen'

/** Eine Zeile in «Heute prüfen». */
export interface HeuteEntwurf {
  id: string
  art: string
  titel: string | null
  kunde: string | null
  projekt_nummer: string | null
  total_rappen: number
  erstellt_am: string
}
export interface HeuteMahnung {
  id: string
  rechnung_id: string | null
  betreff: string
  an: string
  status: string
  nummer: string | null
  kunde: string | null
  offen_rappen: number | null
  mahnstufe: number | null
}
export interface HeuteZahlung {
  id: string
  rechnung_id: string
  datum: string
  betrag_rappen: number
  quelle: string | null
  nummer: string | null
  kunde: string | null
  status: string | null
}
export interface Heute {
  entwuerfe: HeuteEntwurf[]
  mahnungen: HeuteMahnung[]
  zahlungen: HeuteZahlung[]
}

/** Was die Buchhaltung heute prüfen soll (Entwürfe, wartende Mahnungen, neue Zahlungen). */
export async function ladeHeute(): Promise<Heute> {
  const { data, error } = await db().rpc('rechnungen_heute')
  if (error) throw error
  return data as unknown as Heute
}

/** Wartende Mahnungen auf einmal freigeben (Klick = Freigabe, Regel 6); gibt die Zahl zurück. */
export async function mahnungenFreigeben(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('ausgang_freigeben', { p_ids: ids })
  if (error) throw error
  return data
}
