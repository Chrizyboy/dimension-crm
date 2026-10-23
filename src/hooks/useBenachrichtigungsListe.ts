import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ladeServerBenachrichtigungen, serverAusblenden, serverGelesen } from '@/services/benachrichtigungen'
import { meldeFehler } from '@/services/fehler'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useBenachrichtigungen, type Benachrichtigung } from '@/stores/benachrichtigungen'

const SCHLUESSEL = ['benachrichtigungen', 'server'] as const

/**
 * Posteingang der Glocke: Meldungen vom Server (Automationen) und vom Gerät, neueste zuerst.
 * Der Server wird jede Minute neu gefragt; so erscheint «Neuer Lead für dich» ohne Neuladen.
 */
export function useBenachrichtigungsListe() {
  const client = useQueryClient()
  const angemeldet = useAnmeldung((z) => z.status === 'angemeldet')
  const lokal = useBenachrichtigungen()
  const server = useQuery({
    queryKey: SCHLUESSEL,
    enabled: supabase !== null && angemeldet,
    refetchInterval: 60_000,
    queryFn: ladeServerBenachrichtigungen,
  })

  const liste: Benachrichtigung[] = [...(server.data ?? []), ...lokal.liste].sort((a, b) =>
    b.zeit.localeCompare(a.zeit),
  )

  /** Server-Änderung sofort zeigen, danach mit der Datenbank abgleichen. */
  function aendere(neu: (alt: Benachrichtigung[]) => Benachrichtigung[], aufruf: Promise<void>) {
    client.setQueryData<Benachrichtigung[]>(SCHLUESSEL, (alt) => neu(alt ?? []))
    aufruf
      .catch((f: unknown) => {
        meldeFehler(f, 'benachrichtigungen')
      })
      .finally(() => void client.invalidateQueries({ queryKey: SCHLUESSEL }))
  }

  return {
    liste,
    markiereGelesen: (b: Benachrichtigung) => {
      if (b.gelesen) return
      if (b.quelle !== 'server') {
        lokal.markiereGelesen(b.id)
        return
      }
      aendere((alt) => alt.map((x) => (x.id === b.id ? { ...x, gelesen: true } : x)), serverGelesen([b.id]))
    },
    entfernen: (b: Benachrichtigung) => {
      if (b.quelle !== 'server') {
        lokal.entfernen(b.id)
        return
      }
      aendere((alt) => alt.filter((x) => x.id !== b.id), serverAusblenden(b.id))
    },
    alleGelesen: () => {
      lokal.alleGelesen()
      if ((server.data ?? []).some((b) => !b.gelesen)) {
        aendere((alt) => alt.map((x) => ({ ...x, gelesen: true })), serverGelesen())
      }
    },
  }
}
