import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { ladeKalkulationen, ladeOffertAuswahl, ladeVorlagen } from '../services/kalkulationen'
import { ladeImporte } from '../services/importe'
import { ladeLieferanten, ladeLieferantenpreise, ladePreisliste } from '../services/preise'
import { ladeBausteine, ladeLeistungen, ladePreisverlauf, ladeRegeln, ladeVerwendung } from '../services/regeln'

/** Zwischenspeicher-Schlüssel des Bereichs «Preise». */
export const PREIS_SCHLUESSEL = ['preise'] as const

/** Darf die angemeldete Person Einkauf, Marge und Kalkulation sehen (Recht «preise»)? */
export function useDarfPreise(): boolean {
  const ich = useAnmeldung((z) => z.ich)
  return hatRecht(ich, 'preise')
}

/** Preisliste (aktuell und Archiv). */
export function usePreisliste() {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'liste'], queryFn: ladePreisliste, staleTime: 5 * 60_000 })
}

/** Lieferantenpreise eines Artikels. */
export function useLieferantenpreise(artikelId: string | null, aktiv: boolean) {
  return useQuery({
    queryKey: [...PREIS_SCHLUESSEL, 'lieferantenpreise', artikelId],
    queryFn: () => (artikelId ? ladeLieferantenpreise(artikelId) : []),
    enabled: aktiv && artikelId !== null,
  })
}

/** Lieferanten (ändern sich selten). */
export function useLieferanten() {
  return useQuery({ queryKey: ['lieferanten'], queryFn: ladeLieferanten, staleTime: 30 * 60_000 })
}

/** Gespeicherte Kalkulationen. */
export function useKalkulationen(aktiv: boolean) {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'kalkulationen'], queryFn: ladeKalkulationen, enabled: aktiv })
}

/** Vorlagen für die Kalkulation. */
export function useVorlagen(aktiv: boolean) {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'vorlagen'], queryFn: ladeVorlagen, enabled: aktiv })
}

/** Offerten zur Auswahl in der Kalkulation. */
export function useOffertAuswahl(aktiv: boolean) {
  return useQuery({ queryKey: ['offerten', 'auswahl'], queryFn: ladeOffertAuswahl, enabled: aktiv, staleTime: 60_000 })
}

/** Änderung an Preisen oder Kalkulationen; lädt danach Preise und (bei Übernahme) Offerten neu. */
export function usePreisAenderung<A, R = unknown>(aktion: (a: A) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aktion,
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: PREIS_SCHLUESSEL }),
        qc.invalidateQueries({ queryKey: ['offerten'] }),
      ])
    },
  })
}

/** Preis-Regeln (Marge je Kategorie, Grenzen, Förderung). */
export function usePreisRegeln() {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'regeln'], queryFn: ladeRegeln, staleTime: 10 * 60_000 })
}

/** Leistungen & Pauschalen. */
export function useLeistungen() {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'leistungen'], queryFn: ladeLeistungen, staleTime: 10 * 60_000 })
}

/** Bausteine der Kalkulation (nur mit Recht «preise»). */
export function useBausteine(aktiv: boolean) {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'bausteine'], queryFn: ladeBausteine, enabled: aktiv })
}

/** Eingelesene Preislisten. */
export function useImporte(aktiv: boolean) {
  return useQuery({ queryKey: [...PREIS_SCHLUESSEL, 'importe'], queryFn: ladeImporte, enabled: aktiv })
}

/** Preisverlauf und Verwendung eines Artikels (Artikel-Akte). */
export function useArtikelVerlauf(artikelId: string | null, aktiv: boolean) {
  const verlauf = useQuery({
    queryKey: [...PREIS_SCHLUESSEL, 'verlauf', artikelId],
    queryFn: () => (artikelId ? ladePreisverlauf(artikelId) : []),
    enabled: aktiv && artikelId !== null,
  })
  const verwendung = useQuery({
    queryKey: [...PREIS_SCHLUESSEL, 'verwendung', artikelId],
    queryFn: () => (artikelId ? ladeVerwendung(artikelId) : null),
    enabled: aktiv && artikelId !== null,
  })
  return { verlauf, verwendung }
}
