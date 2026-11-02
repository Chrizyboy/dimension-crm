import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import * as r from '../services/rechnungen'
import * as akte from '../services/akte'
import * as e from '../services/eingang'
import * as m from '../services/mahnlauf'
import type { EingangFilter, RechnungFilter } from '../types'

const an = Boolean(supabase)

/** Rechnungen nach Filter, auf Wunsch nur die eines Projekts. */
export const useRechnungen = (filter: RechnungFilter, projektId?: string) =>
  useQuery({
    queryKey: ['rechnungen', 'liste', filter, projektId ?? null],
    enabled: an,
    queryFn: () => r.ladeRechnungen(filter, projektId),
  })

/** Eine Rechnung mit allem für Akte und PDF. */
export const useRechnung = (id: string) =>
  useQuery({ queryKey: ['rechnungen', 'eine', id], enabled: an, queryFn: () => r.ladeRechnung(id) })

/** Was zu verrechnen ist: Tranchen ohne Rechnung und kostenpflichtige Rapporte. */
export const useZuVerrechnen = (aktiv = true) =>
  useQuery({
    queryKey: ['rechnungen', 'verrechnen'],
    enabled: an && aktiv,
    queryFn: async () => {
      const [tranchen, rapporte] = await Promise.all([r.ladeTranchen(), r.ladeOffeneRapporte()])
      return { tranchen, rapporte }
    },
  })

/** Kennzahlen und «Heute zu tun» der Buchhaltung. */
export const useUebersicht = (aktiv = true) =>
  useQuery({ queryKey: ['rechnungen', 'uebersicht'], enabled: an && aktiv, queryFn: m.ladeUebersicht })

/** Vorschlag des Mahnlaufs. */
export const useMahnlauf = (aktiv = true) =>
  useQuery({ queryKey: ['rechnungen', 'mahnlauf'], enabled: an && aktiv, queryFn: m.ladeMahnlauf })

/** Darf ich Mahnungen freigeben? (nur Chris) */
export const useDarfMahnen = () =>
  useQuery({
    queryKey: ['rechnungen', 'darf-mahnen'],
    enabled: an,
    queryFn: m.darfMahnungFreigeben,
    staleTime: 300_000,
  })

/** Zahlungsstand meiner (oder aller) Projekte. */
export const useZahlungsstand = (alle: boolean) =>
  useQuery({ queryKey: ['rechnungen', 'projekte', alle], enabled: an, queryFn: () => m.ladeZahlungsstand(alle) })

/** Verlauf einer Rechnung. */
export const useVerlauf = (id: string) =>
  useQuery({ queryKey: ['rechnungen', 'verlauf', id], enabled: an, queryFn: () => akte.ladeVerlauf(id) })

/** Eingangsrechnungen nach Filter. */
export const useEingang = (filter: EingangFilter, aktiv = true) =>
  useQuery({ queryKey: ['rechnungen', 'eingang', filter], enabled: an && aktiv, queryFn: () => e.ladeEingang(filter) })

/** Eine Eingangsrechnung für die Akte. */
export const useEingangEine = (id: string) =>
  useQuery({ queryKey: ['rechnungen', 'eingang-eine', id], enabled: an, queryFn: () => e.ladeEingangEine(id) })

/** Vergleich einer Eingangsrechnung mit der Bestellung. */
export const useVergleich = (id: string) =>
  useQuery({ queryKey: ['rechnungen', 'eingang-vergleich', id], enabled: an, queryFn: () => e.ladeVergleich(id) })

export const useFirmen = () => useQuery({ queryKey: ['rechnungen', 'firmen'], enabled: an, queryFn: r.ladeFirmen })

/** Nach einer Änderung Rechnungen und Projekte (Fahrplan «Anzahlung», «Schluss») neu laden. */
export function useNeuLaden() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['rechnungen'] }),
      qc.invalidateQueries({ queryKey: ['projekte'] }),
      qc.invalidateQueries({ queryKey: ['finanzen'] }),
      qc.invalidateQueries({ queryKey: ['einstellungen', 'finanzen'] }),
    ])
  }
}
