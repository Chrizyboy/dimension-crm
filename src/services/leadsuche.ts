import { supabase } from './supabase'

export interface LeadTreffer {
  id: string
  nummer: string
  name: string
  ort: string | null
  stand: string | null
}

/** Sieht die Eingabe wie eine Lead-Nummer aus («L12», «l012»)? Nur dann fragt die Palette nach. */
export function istLeadNummer(text: string): boolean {
  return /^l\d+$/i.test(text.trim())
}

/**
 * Sucht Leads nach Nummer für die Befehlspalette (Ctrl K). Liegt in den gemeinsamen Diensten,
 * weil die Palette zum App-Rahmen gehört und Module sich nicht direkt importieren.
 */
export async function sucheLeadNummer(text: string): Promise<LeadTreffer[]> {
  if (!supabase) return []
  const ziffern = text.trim().slice(1).replace(/^0+/, '')
  const { data, error } = await supabase
    .from('verkauf_geschaefte')
    .select('id, lead_nummer, name, ort, stand')
    .ilike('lead_nummer', `L%${ziffern}%`)
    .order('lead_nummer')
    .limit(6)
  if (error) throw error
  return data.flatMap((z) =>
    z.id && z.lead_nummer ? [{ id: z.id, nummer: z.lead_nummer, name: z.name ?? '–', ort: z.ort, stand: z.stand }] : [],
  )
}
