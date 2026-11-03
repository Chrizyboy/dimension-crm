import { supabase } from '@/services/supabase'
import type { StuecklistenPosition, StuecklistenTyp } from '../types'

const TYPEN: readonly StuecklistenTyp[] = ['modul', 'wechselrichter', 'batterie', 'optimierer', 'unterkonstruktion']

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Stückliste einer Offerte; einzeln geladen, damit die Offertliste klein bleibt. */
export async function ladeStueckliste(offerteId: string): Promise<StuecklistenPosition[]> {
  const { data, error } = await db().from('offerten').select('stueckliste').eq('id', offerteId).maybeSingle()
  if (error) throw error
  return stuecklisteAusDb(data?.stueckliste)
}

/** JSON aus der Datenbank → Positionen; Unbekanntes wird übersprungen statt geraten. */
export function stuecklisteAusDb(roh: unknown): StuecklistenPosition[] {
  if (!Array.isArray(roh)) return []
  return roh.flatMap((x: Record<string, unknown>): StuecklistenPosition[] => {
    if (typeof x !== 'object' || typeof x.bezeichnung !== 'string') return []
    const typ = TYPEN.find((t) => t === x.typ) ?? null
    return [
      {
        gruppe: typeof x.gruppe === 'string' ? x.gruppe : '',
        typ,
        bezeichnung: x.bezeichnung,
        menge: Number(x.menge) || 0,
        einheit: typeof x.einheit === 'string' ? x.einheit : '',
        epRappen: Number(x.ep_rappen) || 0,
        preisRappen: Number(x.preis_rappen) || 0,
        art: x.art === 'leistung' ? 'leistung' : 'material',
        optional: x.optional === true,
      },
    ]
  })
}

/** Positionen → JSON für `offerte_werte_setzen` (Spaltennamen wie in der Datenbank). */
export function stuecklisteFuerDb(liste: readonly StuecklistenPosition[]) {
  return liste.map((p) => ({
    gruppe: p.gruppe,
    typ: p.typ,
    bezeichnung: p.bezeichnung,
    menge: p.menge,
    einheit: p.einheit,
    ep_rappen: p.epRappen,
    preis_rappen: p.preisRappen,
    art: p.art,
    optional: p.optional,
  }))
}
