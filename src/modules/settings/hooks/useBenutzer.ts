import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ladeEinladungen, ladePersonen, ladeRollen, ladeStandorte } from '../services/benutzer'

/** Schlüssel für den Zwischenspeicher, damit Änderungen gezielt neu laden. */
export const BENUTZER_SCHLUESSEL = ['einstellungen', 'benutzer'] as const

/** Personen, Rollen, Standorte und Einladungen für die Benutzerverwaltung. */
export function useBenutzerDaten() {
  const personen = useQuery({ queryKey: [...BENUTZER_SCHLUESSEL, 'personen'], queryFn: ladePersonen })
  const rollen = useQuery({ queryKey: [...BENUTZER_SCHLUESSEL, 'rollen'], queryFn: ladeRollen })
  const standorte = useQuery({ queryKey: [...BENUTZER_SCHLUESSEL, 'standorte'], queryFn: ladeStandorte })
  const einladungen = useQuery({ queryKey: [...BENUTZER_SCHLUESSEL, 'einladungen'], queryFn: ladeEinladungen })
  return { personen, rollen, standorte, einladungen }
}

/** Führt eine Änderung aus und lädt danach die Benutzerdaten neu. */
export function useBenutzerAenderung<T, R>(ausfuehren: (eingabe: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ausfuehren,
    onSuccess: () => client.invalidateQueries({ queryKey: BENUTZER_SCHLUESSEL }),
  })
}
