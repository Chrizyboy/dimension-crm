import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { useAnmeldung } from '@/stores/anmeldung'
import { ladeMonatsbericht } from '../services/bericht'
import { ladeAussendienst, ladeGeschaefte } from '../services/geschaefte'
import { ladeLeadDateien, ladeLeadDetails, ladeLeadVerlauf, ladeRegionen, ladeStandorte } from '../services/leads'
import { ladeAnsichten, ladeKalender, ladeLagen, ladeSmsVorlage, ladeTourEinstellungen } from '../services/planung'
import type { Ort } from '../lib/ablauf'

/** Zwischenspeicher-Schlüssel aller Verkaufsdaten (Pipeline, Liste, Karte, Kalender). */
export const VERKAUF_SCHLUESSEL = ['verkauf'] as const
const SELTEN = 10 * 60_000

/** Alle Geschäfte der Pipeline. */
export function useGeschaefte() {
  return useQuery({ queryKey: [...VERKAUF_SCHLUESSEL, 'geschaefte'], queryFn: ladeGeschaefte })
}

/** Personen mit Kundenterminen; ändert sich selten. */
export function useAussendienst() {
  return useQuery({ queryKey: [...VERKAUF_SCHLUESSEL, 'aussendienst'], queryFn: ladeAussendienst, staleTime: SELTEN })
}

/** Regionen (Tour / Region). */
export function useRegionen() {
  return useQuery({ queryKey: [...VERKAUF_SCHLUESSEL, 'regionen'], queryFn: ladeRegionen, staleTime: SELTEN })
}

/**
 * Standorte Muri und Bulle als Orte mit Lage (aus ihrer PLZ), dazu die Heimadressen des Aussendiensts.
 * Start und Ziel der Tagesroute.
 */
export function useOrte() {
  const aussendienst = useAussendienst()
  return useQuery({
    queryKey: [...VERKAUF_SCHLUESSEL, 'orte', aussendienst.data?.length ?? 0],
    enabled: aussendienst.isSuccess,
    staleTime: SELTEN,
    queryFn: async () => {
      const standorte = await ladeStandorte()
      const heime = (aussendienst.data ?? []).filter((p) => p.heim)
      const lagen = await ladeLagen([...standorte.map((s) => s.plz ?? ''), ...heime.map((p) => p.heim?.plz ?? '')])
      const ort = (name: string, strasse: string | null, plz: string | null, ortName: string | null): Ort | null => {
        const lage = plz ? lagen.get(plz) : undefined
        if (!lage) return null
        const adresse = [strasse, [plz, ortName].filter(Boolean).join(' ')].filter(Boolean).join(', ')
        return { name, adresse, breite: lage.breite, laenge: lage.laenge }
      }
      const standortOrte: Record<string, Ort> = {}
      for (const s of standorte) {
        const o = ort(s.name, s.strasse, s.plz, s.ort)
        if (o) standortOrte[s.kuerzel] = o
      }
      const heimOrte: Record<string, Ort> = {}
      for (const p of heime) {
        const o = p.heim ? ort(p.vorname, p.heim.strasse, p.heim.plz, p.heim.ort) : null
        if (o) heimOrte[p.id] = o
      }
      return {
        standorte: standortOrte,
        standortIds: Object.fromEntries(standorte.map((s) => [s.kuerzel, s.id])),
        heime: heimOrte,
      }
    },
  })
}

/** Einstellungen der Tourplanung. */
export function useTourEinstellungen() {
  return useQuery({ queryKey: ['einstellungen', 'tourplanung'], queryFn: ladeTourEinstellungen, staleTime: SELTEN })
}

/** SMS-Vorlage für die Erinnerung am Vortag. */
export function useSmsVorlage() {
  return useQuery({ queryKey: ['einstellungen', 'sms_erinnerung'], queryFn: ladeSmsVorlage, staleTime: SELTEN })
}

/** Kalendereinträge aller Personen im Zeitraum (ISO). */
export function useKalender(von: string, bis: string) {
  return useQuery({ queryKey: [...VERKAUF_SCHLUESSEL, 'kalender', von, bis], queryFn: () => ladeKalender(von, bis) })
}

/** Gespeicherte Ansichten der Liste. */
export function useAnsichten(bereich: string) {
  const ich = useAnmeldung((z) => z.ich?.id ?? null)
  return useQuery({
    queryKey: [...VERKAUF_SCHLUESSEL, 'ansichten', bereich],
    queryFn: () => ladeAnsichten(bereich, ich),
  })
}

/** Monatsbericht eines Monats (JJJJ-MM). */
export function useMonatsbericht(monat: string) {
  return useQuery({ queryKey: [...VERKAUF_SCHLUESSEL, 'bericht', monat], queryFn: () => ladeMonatsbericht(monat) })
}

/** Kontaktverlauf, Zusatzangaben und Dateien eines Leads für die Lead-Akte. */
export function useLeadAkte(verkaufschanceId: string | null) {
  const an = verkaufschanceId !== null
  const id = verkaufschanceId ?? ''
  return {
    verlauf: useQuery({
      queryKey: [...VERKAUF_SCHLUESSEL, 'akte', id, 'verlauf'],
      queryFn: () => ladeLeadVerlauf(id),
      enabled: an,
    }),
    details: useQuery({
      queryKey: [...VERKAUF_SCHLUESSEL, 'akte', id, 'details'],
      queryFn: () => ladeLeadDetails(id),
      enabled: an,
    }),
    dateien: useQuery({
      queryKey: [...VERKAUF_SCHLUESSEL, 'akte', id, 'dateien'],
      queryFn: () => ladeLeadDateien(id),
      enabled: an,
    }),
  }
}

/**
 * Führt eine Änderung aus und lädt danach Verkauf und Kunden neu: ein Lead ist auch Teil der Kundenakte.
 * Nicht auf das Neuladen warten, damit Dialoge sofort schliessen.
 */
export function useVerkaufAenderung<T, R>(ausfuehren: (eingabe: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ausfuehren,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VERKAUF_SCHLUESSEL })
      void client.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
    },
  })
}
