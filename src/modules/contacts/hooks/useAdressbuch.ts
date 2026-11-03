import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { ladeAkte, ladeEinstellungen, ladeKopf, ladePartner, ladeVerlauf } from '../services/adressbuch'
import { ladeNetzStand } from '../services/netz'

/**
 * Zwischenspeicher des Adressbuchs unter dem gemeinsamen Schlüssel der Kontakte: eine Änderung in Kunden oder
 * Adressbuch lädt beide Listen neu (ein Partner kann auch Kunde sein).
 */
const SCHLUESSEL = [...KONTAKT_SCHLUESSEL, 'partner'] as const

/** Alle Geschäftspartner (oder die im Papierkorb). */
export function usePartner(papierkorb = false) {
  return useQuery({ queryKey: [...SCHLUESSEL, 'liste', papierkorb], queryFn: () => ladePartner(papierkorb) })
}

/** Kopf, Akte und Verlauf eines Partners, einzeln geladen, damit der Kopf sofort steht. */
export function usePartnerAkte(id: string) {
  const kopf = useQuery({ queryKey: [...SCHLUESSEL, 'kopf', id], queryFn: () => ladeKopf(id) })
  const akte = useQuery({ queryKey: [...SCHLUESSEL, 'akte', id], queryFn: () => ladeAkte(id) })
  const verlauf = useQuery({ queryKey: [...SCHLUESSEL, 'verlauf', id], queryFn: () => ladeVerlauf(id) })
  return { kopf, akte, verlauf }
}

/** Fristen aus den Einstellungen (selten geändert, darum lange zwischengespeichert). */
export function useAdressbuchEinstellungen() {
  return useQuery({ queryKey: ['einstellungen', 'adressbuch'], queryFn: ladeEinstellungen, staleTime: 30 * 60_000 })
}

/** Stand des ElCom-Verzeichnisses (für die Administration). */
export function useNetzStand(aktiv: boolean) {
  return useQuery({ queryKey: ['netzbetreiber', 'stand'], queryFn: ladeNetzStand, enabled: aktiv })
}

/** Führt eine Änderung aus und lädt danach alles zu Kontakten neu (Liste, Akte, Kunden). */
export function useAdressbuchAenderung<T, R>(ausfuehren: (eingabe: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ausfuehren,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
      void client.invalidateQueries({ queryKey: ['netzbetreiber'] })
    },
  })
}
