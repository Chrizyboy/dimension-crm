import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuswahl } from '@/hooks/useAuswahl'
import { supabase } from '@/services/supabase'
import { ausweisLuecken, taetigkeitPflichten, type AusweisLuecke } from '../lib/ausweise'
import { ladeAusweisStand } from '../services/planung'
import type { Einsatz } from '../types'

/**
 * Pflicht-Ausweise je Tätigkeit für Zeitplan und Planungsdialog: Regeln aus der Auswahlliste «taetigkeit»,
 * Ausweise aller Personen. Liefert die Tätigkeiten zum Ankreuzen und eine Funktion für die Lücken eines Einsatzes.
 */
export function useAusweisPflicht() {
  const taetigkeit = useAuswahl('taetigkeit')
  const stand = useQuery({
    queryKey: ['projekte', 'ausweise'],
    enabled: supabase !== null,
    queryFn: ladeAusweisStand,
    staleTime: 5 * 60_000,
  })
  const pflichten = taetigkeitPflichten(taetigkeit.werte)
  const daten = stand.data
  const luecken = useCallback(
    (e: Pick<Einsatz, 'art' | 'bis' | 'personen' | 'taetigkeiten'>): AusweisLuecke[] =>
      daten ? ausweisLuecken(e, taetigkeitPflichten(taetigkeit.werte), daten) : [],
    [daten, taetigkeit.werte],
  )
  return { pflichten, text: taetigkeit.text, luecken }
}
