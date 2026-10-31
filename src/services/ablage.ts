import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

/** Ordner einer Offerte oder eines Projekts in SharePoint (automatische Dateiablage, Entscheid 0031). */
export interface AblageOrdner {
  soll: 'offerte' | 'auftrag' | 'verloren'
  stand: 'offerte' | 'auftrag' | 'verloren' | null
  url: string | null
  fehler: string | null
}

/** Einstellung «ablage» (nur Administration ändert sie). */
export interface AblageEinstellung {
  aktiv: boolean
  aktiv_seit: string | null
  bibliothek?: string
  person?: string
  name?: string
  standorte: Record<string, { offerten: string; auftraege: string; verloren: string }>
  unterordner: Record<string, string>
  zuordnung: Record<string, string>
}

/**
 * Ordner zu einer Offerte oder einem Projekt (null = keiner, z. B. ältere Offerte oder Ablage aus).
 * Bei einem Projekt zählt auch der Ordner seiner Offerte.
 */
export function useAblageOrdner(bezug: { offerteId?: string | null; projektId?: string | null }) {
  const { offerteId = null, projektId = null } = bezug
  return useQuery({
    queryKey: ['ablage', offerteId, projektId],
    enabled: Boolean(supabase && (offerteId || projektId)),
    queryFn: async () => {
      if (!supabase) return null
      const filter = [offerteId && `offerte_id.eq.${offerteId}`, projektId && `projekt_id.eq.${projektId}`]
        .filter(Boolean)
        .join(',')
      const { data, error } = await supabase
        .from('ablage_ordner')
        .select('soll, stand, url, fehler')
        .or(filter)
        .is('geloescht_am', null)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as AblageOrdner | null
    },
  })
}

/** Einstellung der Ablage mit Zahlen für die Übersicht (angelegt, wartend, mit Fehler). */
export function useAblageStand() {
  return useQuery({
    queryKey: ['ablage', 'stand'],
    enabled: Boolean(supabase),
    queryFn: async () => {
      if (!supabase) return null
      const [e, o] = await Promise.all([
        supabase.from('einstellungen').select('wert').eq('schluessel', 'ablage').maybeSingle(),
        supabase.from('ablage_ordner').select('stand, soll, fehler').is('geloescht_am', null),
      ])
      if (e.error) throw e.error
      if (o.error) throw o.error
      const zeilen = o.data
      return {
        einstellung: (e.data?.wert ?? null) as AblageEinstellung | null,
        fertig: zeilen.filter((z) => z.stand === z.soll).length,
        wartend: zeilen.filter((z) => z.stand !== z.soll && !z.fehler).length,
        fehler: zeilen.filter((z) => z.fehler).length,
      }
    },
  })
}

/** Ablage-Einstellung speichern; beim Einschalten zählt sie ab jetzt (alte Offerten bleiben, wie sie sind). */
export async function speichereAblage(neu: AblageEinstellung, vorher: AblageEinstellung | null): Promise<void> {
  if (!supabase) throw new Error('nicht verbunden')
  const wert = { ...neu, aktiv_seit: neu.aktiv && !vorher?.aktiv ? new Date().toISOString() : neu.aktiv_seit }
  const { error } = await supabase.from('einstellungen').update({ wert }).eq('schluessel', 'ablage')
  if (error) throw error
}

/** Nach dem Speichern: Anzeige neu laden. */
export function useAblageNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['ablage'] })
}
