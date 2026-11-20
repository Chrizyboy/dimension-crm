import { supabase } from '@/services/supabase'

/** Ein Eintrag im Änderungsverlauf eines Datensatzes. */
export interface VerlaufEintrag {
  id: number
  tabelle: string
  aktion: string
  vorher: unknown
  nachher: unknown
  benutzer: string | null
  zeitpunkt: string
}

/**
 * Änderungsverlauf eines oder mehrerer Datensätze (z. B. Offerte und ihr Lead), neueste zuerst, höchstens 200.
 * Kommt aus dem Protokoll der Datenbank (Trigger `intern.protokolliere`); RLS zeigt nur, was man lesen darf.
 */
export async function ladeVerlauf(bezuege: { tabelle: string; id: string }[]): Promise<VerlaufEintrag[]> {
  if (!supabase || bezuege.length === 0) return []
  const oder = bezuege.map((b) => `and(tabelle.eq.${b.tabelle},datensatz.eq.${b.id})`).join(',')
  const { data, error } = await supabase
    .from('aenderungsprotokoll')
    .select('id, tabelle, aktion, vorher, nachher, benutzer, zeitpunkt')
    .or(oder)
    .order('zeitpunkt', { ascending: false })
    .limit(200)
  if (error) throw error
  return data
}

/** Namen der Personen nach Anmelde-Konto, damit der Verlauf «wer» zeigen kann. */
export async function ladeKontoNamen(): Promise<Map<string, string>> {
  if (!supabase) return new Map()
  const { data, error } = await supabase.from('personen').select('name, auth_user_id').not('auth_user_id', 'is', null)
  if (error) throw error
  return new Map(data.flatMap((p) => (p.auth_user_id ? [[p.auth_user_id, p.name] as const] : [])))
}
