import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Ein Lead im Monatsbericht. */
export interface BerichtLead {
  id: string
  nummer: string | null
  name: string
  ort: string | null
  eingang_am: string
  stand: string
  grund: string | null
}

/** Zahlen einer Quelle im Monat: erhalten laut CRM, gekauft laut Anbieter, Bericht und Meldung. */
export interface BerichtQuelle {
  quelle: string
  erhalten: number
  inBearbeitung: number
  termin: number
  offeriert: number
  keinInteresse: number
  leads: BerichtLead[]
  einkaufId: string | null
  gekauft: number | null
  berichtText: string | null
  gemeldet: { am: string | null; von: string | null; an: string; anzahl: number | null } | null
}

/** Monatsbericht (V174–V176): zählt die erhaltenen Leads und legt die Einkaufszahlen daneben. */
export async function ladeMonatsbericht(monat: string): Promise<BerichtQuelle[]> {
  const erster = `${monat.slice(0, 7)}-01`
  const [zahlen, einkauf] = await Promise.all([
    db().rpc('lead_monatsbericht', { p_monat: erster }),
    db()
      .from('lead_einkauf')
      .select('id, quelle, gekauft, bericht_text, gemeldet')
      .eq('monat', erster)
      .is('geloescht_am', null),
  ])
  if (zahlen.error) throw zahlen.error
  if (einkauf.error) throw einkauf.error
  const proQuelle = new Map(einkauf.data.map((e) => [e.quelle, e]))
  const liste: BerichtQuelle[] = zahlen.data.map((z) => {
    const e = proQuelle.get(z.quelle)
    proQuelle.delete(z.quelle)
    return {
      quelle: z.quelle,
      erhalten: z.erhalten,
      inBearbeitung: z.in_bearbeitung,
      termin: z.termin,
      offeriert: z.offeriert,
      keinInteresse: z.kein_interesse,
      leads: (z.leads ?? []) as unknown as BerichtLead[],
      einkaufId: e?.id ?? null,
      gekauft: e?.gekauft ?? null,
      berichtText: e?.bericht_text ?? null,
      gemeldet: (e?.gemeldet as BerichtQuelle['gemeldet'] | undefined) ?? null,
    }
  })
  // Gekauft, aber kein einziger Lead erhalten: gerade dann muss es im Bericht stehen.
  for (const e of proQuelle.values())
    liste.push({
      quelle: e.quelle,
      erhalten: 0,
      inBearbeitung: 0,
      termin: 0,
      offeriert: 0,
      keinInteresse: 0,
      leads: [],
      einkaufId: e.id,
      gekauft: e.gekauft,
      berichtText: e.bericht_text,
      gemeldet: e.gemeldet as BerichtQuelle['gemeldet'],
    })
  return liste
}

/** Speichert gekaufte Anzahl und Bericht-Text einer Quelle im Monat. */
export async function speichereEinkauf(
  monat: string,
  quelle: string,
  felder: { gekauft?: number | null; bericht_text?: string | null; gemeldet?: Json },
): Promise<void> {
  const erster = `${monat.slice(0, 7)}-01`
  const { data, error } = await db()
    .from('lead_einkauf')
    .select('id')
    .eq('monat', erster)
    .eq('quelle', quelle)
    .is('geloescht_am', null)
    .maybeSingle()
  if (error) throw error
  const antwort = data
    ? await db().from('lead_einkauf').update(felder).eq('id', data.id)
    : await db()
        .from('lead_einkauf')
        .insert({ monat: erster, quelle, ...felder })
  if (antwort.error) throw antwort.error
}
