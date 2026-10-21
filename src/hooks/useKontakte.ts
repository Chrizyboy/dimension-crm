import { useQuery } from '@tanstack/react-query'
import { ladeKontakte } from '@/services/kontakte'

/**
 * Schlüssel für den Zwischenspeicher aller Kontakt-Daten. Kunden und Adressbuch teilen ihn,
 * damit eine Änderung in einem Bereich auch die Liste im anderen neu lädt.
 */
export const KONTAKT_SCHLUESSEL = ['kontakte'] as const

/** Alle Kontakte für Listen und Filter (oder nur die im Papierkorb). */
export function useKontakte(papierkorb = false) {
  return useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'liste', papierkorb],
    queryFn: () => ladeKontakte({ papierkorb }),
  })
}
