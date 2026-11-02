import { alleSeiten } from '@/services/seiten'
import { supabase } from '@/services/supabase'

/** Offerte, aus der ein neuer Werkvertrag entstehen kann. */
export interface OfferteOhneVertrag {
  id: string
  nummer: string
  name: string
  ort: string | null
  status: string
  betragRappen: number | null
  kwp: number | null
  batterie: string | null
  datum: string | null
  suchtext: string
}

/** Angenommen zuerst (dort fehlt der Vertrag am ehesten), dann Offeriert und In Arbeit. */
const REIHE: Record<string, number> = { angenommen: 0, offeriert: 1, in_arbeit: 2 }

/**
 * Offerten ohne gültigen Werkvertrag für «Neuer Werkvertrag». Verlorene und archivierte fehlen, weil
 * `auftrag_erstellen` sie ablehnt; eine noch offene Offerte wird beim Erstellen auf «Angenommen» gesetzt.
 */
export async function ladeOffertenOhneVertrag(): Promise<OfferteOhneVertrag[]> {
  if (!supabase) return []
  const db = supabase
  const zeilen = await alleSeiten((von, bis) =>
    db
      .from('offerten_liste')
      .select(
        'id, nummer, name, ort, plz, status, betrag_rappen, leistung_kwp, batterie, entscheid_am, angebot_am, suchtext',
      )
      .in('status', Object.keys(REIHE))
      .is('werkvertrag_id', null)
      .order('nummer', { ascending: false })
      .order('id')
      .range(von, bis),
  )
  return zeilen
    .filter((z) => z.id)
    .map((z) => ({
      id: z.id ?? '',
      nummer: z.nummer ?? '',
      name: z.name ?? '–',
      ort: [z.plz, z.ort].filter(Boolean).join(' ') || null,
      status: z.status ?? '',
      betragRappen: z.betrag_rappen,
      kwp: z.leistung_kwp,
      batterie: z.batterie,
      datum: z.entscheid_am ?? z.angebot_am,
      suchtext: [z.suchtext, z.nummer, z.name, z.ort, z.plz].filter(Boolean).join(' '),
    }))
    .sort((a, b) => (REIHE[a.status] ?? 9) - (REIHE[b.status] ?? 9))
}
