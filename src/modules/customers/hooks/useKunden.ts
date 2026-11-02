import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { ladeKontakt } from '@/services/kontakte'
import { ladeKundenakte, ladeZeitachse } from '../services/kundenakte'
import { ladeNachverkauf } from '../services/nachverkauf'
import type { Kundenakte } from '../types'

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

/**
 * Anlagen, Service, Wartung, Rechnungen, Aufgaben und Mails eines Kontakts. Braucht die Gebäude und Geschäfte aus
 * der Akte (Anlagen hängen am Gebäude, Aufgaben oft am Geschäft), darum erst, wenn die Akte da ist.
 */
export function useNachverkauf(id: string, akte: Kundenakte | null | undefined) {
  const objekte = akte?.objekte.map((o) => o.id) ?? []
  const bezuege = akte
    ? [...akte.verkaufschancen, ...akte.offerten, ...akte.projekte, ...akte.werkvertraege].map((x) => x.id)
    : []
  return useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'nachverkauf', id, objekte.join(), bezuege.join()],
    queryFn: () => ladeNachverkauf(id, objekte, bezuege),
    enabled: Boolean(akte),
  })
}

/** Führt eine Änderung aus und lädt danach alles zu Kontakten neu. */
export function useKontaktAenderung<T, R>(ausfuehren: (eingabe: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ausfuehren,
    // Nicht auf das Neuladen warten: der Dialog schliesst sofort, die Listen ziehen im Hintergrund nach.
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
    },
  })
}
