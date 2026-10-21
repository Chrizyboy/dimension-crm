import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { ladeKontakt } from '@/services/kontakte'
import { ladeKundenakte, ladeZeitachse } from '../services/kundenakte'

/** Kopf, Einträge und Zeitachse einer Kundenakte, jeweils einzeln, damit der Kopf sofort steht. */
export function useKundenakte(id: string | null) {
  const aktiv = id !== null
  const kopf = useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'kopf', id],
    queryFn: () => ladeKontakt(id ?? ''),
    enabled: aktiv,
  })
  const akte = useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'akte', id],
    queryFn: () => ladeKundenakte(id ?? ''),
    enabled: aktiv,
  })
  const zeitachse = useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'zeitachse', id],
    queryFn: () => ladeZeitachse(id ?? ''),
    enabled: aktiv,
  })
  return { kopf, akte, zeitachse }
}

/** Führt eine Änderung aus und lädt danach alles zu Kontakten neu. */
export function useKontaktAenderung<T, R>(ausfuehren: (eingabe: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ausfuehren,
    onSuccess: () => client.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL }),
  })
}
