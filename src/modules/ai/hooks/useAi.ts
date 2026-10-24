import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { ladeEinstellungen, ladeKosten, ladeStil } from '../services/ai'

/** Kosten eines Zeitraums. */
export function useKosten(von: string, bis: string) {
  return useQuery({
    queryKey: ['ki', 'kosten', von, bis],
    enabled: Boolean(supabase),
    queryFn: () => ladeKosten(von, bis),
  })
}

/** KI-Einstellungen. */
export function useKiEinstellungen() {
  return useQuery({ queryKey: ['ki', 'einstellungen'], enabled: Boolean(supabase), queryFn: ladeEinstellungen })
}

/** Eigener Schreibstil. */
export function useStil(personId: string | null) {
  return useQuery({
    queryKey: ['ki', 'stil', personId],
    enabled: Boolean(supabase && personId),
    queryFn: () => (personId ? ladeStil(personId) : null),
  })
}

/** Speichern mit Meldung; lädt danach alles unter «ki» neu. */
export function useKiAktion() {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: (f: () => Promise<void>) => f(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['ki'] }),
  })
  async function aus(f: () => Promise<void>, ok: { de: string; fr: string }) {
    try {
      await m.mutateAsync(f)
      melde('ok', ok)
    } catch (e) {
      meldeFehler(e, 'ki')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }
  return { laeuft: m.isPending, aus }
}
