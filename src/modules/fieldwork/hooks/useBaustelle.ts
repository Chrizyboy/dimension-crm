import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { istNetzFehler } from '../lib/netz'
import * as b from '../services/baustelle'
import { ladeInfos } from '../services/leitung'
import { ABLAGE_TAG, ablageNachtraege, ablageRapport } from '../services/monteur'
import { ablageLesen } from '../services/speicher'
import { mitAblage, offeneDateien, useWarteschlange } from '../services/warteschlange'
import type { MeinTag, Nachtrag, NachtragEingabe, NachtragFilter, Rapport, RapportFilter } from '../types'

const an = Boolean(supabase)
// Ansichten mit Ablage am Gerät laufen auch ohne Netz (networkMode «always»), sonst würde React Query sie anhalten.

/**
 * Tagesplan mit den Zusätzen je Einsatz (Schritte, Pflichtfotos, Team mit IDs). Fehlen die Zusätze (z. B. ältere
 * Datenbank), bleibt der Tagesplan trotzdem nutzbar.
 */
async function tagMitInfos(von: string, bis: string, person?: string | null): Promise<MeinTag> {
  const t = await b.ladeTag(von, bis, person)
  const ids = t.eintraege.filter((e) => e.typ === 'einsatz').map((e) => e.id)
  const infos = await ladeInfos(ids).catch(() => ({}) as Record<string, never>)
  return {
    ...t,
    eintraege: t.eintraege.map((e) => ({ ...e, info: e.typ === 'einsatz' ? (infos[e.id] ?? null) : null })),
  }
}

/** Tagesplan; für die eigene Person mit Ablage am Gerät (funktioniert ohne Netz). */
export const useTag = (von: string, bis: string, person: string | null) =>
  useQuery({
    queryKey: ['baustelle', 'tag', von, bis, person],
    networkMode: 'always',
    enabled: an,
    queryFn: async (): Promise<MeinTag> => {
      if (person) return tagMitInfos(von, bis, person)
      const t = await mitAblage(ABLAGE_TAG, async () => ({
        schluessel: `${von}:${bis}`,
        daten: await tagMitInfos(von, bis),
      }))
      return t.daten
    },
  })

/** Eigene Abwesenheiten für «Mein Plan», mit Kopie am Gerät (auch ohne Netz sichtbar). */
export const useAbwesenheiten = (von: string, bis: string, person: string | null) =>
  useQuery({
    queryKey: ['baustelle', 'abwesenheiten', von, bis, person],
    networkMode: 'always',
    enabled: an && Boolean(person),
    queryFn: async () => {
      const a = await mitAblage('abwesenheiten', async () => ({
        schluessel: `${von}:${bis}`,
        daten: await b.ladeAbwesenheiten(von, bis, person ?? ''),
      }))
      return a.daten
    },
  })

/** Ein Rapport, auch wenn er erst am Handy existiert. */
export const useRapport = (id: string) =>
  useQuery({
    queryKey: ['baustelle', 'rapport', id],
    networkMode: 'always',
    enabled: an,
    queryFn: () =>
      mitAblage(ablageRapport(id), async () => {
        const r = await b.ladeRapport(id)
        if (r) return r
        const lokal = await ablageLesen<Rapport>(ablageRapport(id))
        if (lokal) return lokal
        throw new Error('Rapport nicht gefunden')
      }),
  })

/** Nachträge eines Rapports (auch die noch nicht gesendeten). */
export const useRapportNachtraege = (id: string) =>
  useQuery({
    queryKey: ['baustelle', 'rapport-nachtraege', id],
    networkMode: 'always',
    enabled: an,
    queryFn: () =>
      mitAblage<(NachtragEingabe & Partial<Nachtrag>)[]>(ablageNachtraege(id), () => b.ladeNachtraege('alle', id)),
  })

/** Fotos und Unterschrift eines Rapports mit Adresse fürs Vorschaubild; nicht gesendete aus der Warteschlange. */
export const useBilder = (rapportId: string) => {
  const version = useWarteschlange((s) => s.version + s.offen)
  return useQuery({
    queryKey: ['baustelle', 'bilder', rapportId, version],
    networkMode: 'always',
    enabled: an,
    queryFn: async () => {
      const [server, lokal] = await Promise.all([
        mitAblage(`bilder:${rapportId}`, () => b.ladeBilder(rapportId)).catch((e: unknown) => {
          if (istNetzFehler(e)) return []
          throw e
        }),
        offeneDateien(rapportId),
      ])
      const pfade = server.flatMap((d) => (d.speicher_pfad ? [d.speicher_pfad] : []))
      const adressen = navigator.onLine
        ? await b.bildAdressen(pfade).catch(() => new Map<string, string>())
        : new Map<string, string>()
      const oben = new Set(server.map((d) => d.id))
      return [
        ...server.map((d) => ({ ...d, url: d.speicher_pfad ? (adressen.get(d.speicher_pfad) ?? null) : null })),
        ...lokal
          .filter((a) => !oben.has(a.dokument.id))
          .map((a) => ({
            id: a.dokument.id,
            name: a.dokument.name,
            ordner: a.dokument.ordner,
            kategorie: a.dokument.kategorie ?? null,
            speicher_pfad: null,
            lokal: true,
            url: URL.createObjectURL(a.blob),
          })),
      ]
    },
  })
}

/** Wochenplan je Person (nur mit Netz, fürs Büro). */
export const useWochenplan = (von: string, bis: string) =>
  useQuery({ queryKey: ['baustelle', 'wochenplan', von, bis], enabled: an, queryFn: () => b.ladeWochenplan(von, bis) })

/** Pflichtfotos je Rapport-Art; auch ohne Netz aus der Ablage. */
export const usePflichtfotos = () =>
  useQuery({
    queryKey: ['baustelle', 'pflichtfotos'],
    networkMode: 'always',
    enabled: an,
    staleTime: 30 * 60_000,
    queryFn: () => mitAblage('pflichtfotos', b.ladePflichtfotos),
  })

export const usePruefpunkte = () =>
  useQuery({
    queryKey: ['baustelle', 'pruefpunkte'],
    networkMode: 'always',
    enabled: an,
    staleTime: 30 * 60_000,
    queryFn: () => mitAblage('pruefpunkte', b.ladePruefpunkte),
  })

/** Prüfpunkte und Vorjahr einer Inspektion, mit Kopie am Gerät (die Inspektion läuft auch ohne Netz). */
export const useWartungPruefung = (vertragId: string | null) =>
  useQuery({
    queryKey: ['baustelle', 'wartung', vertragId],
    networkMode: 'always',
    enabled: an && Boolean(vertragId),
    staleTime: 10 * 60_000,
    queryFn: () => mitAblage(`wartung-${vertragId ?? ''}`, () => b.ladeWartungPruefung(vertragId ?? '')),
  })

export const useRapporte = (filter: RapportFilter) =>
  useQuery({ queryKey: ['baustelle', 'rapporte', filter], enabled: an, queryFn: () => b.ladeRapporte(filter) })

export const useNachtraege = (filter: NachtragFilter) =>
  useQuery({ queryKey: ['baustelle', 'nachtraege', filter], enabled: an, queryFn: () => b.ladeNachtraege(filter) })

export const useZeiten = (von: string, bis: string, person: string | null) =>
  useQuery({
    queryKey: ['baustelle', 'zeiten', von, bis, person],
    enabled: an,
    queryFn: () => b.ladeZeiten(von, bis, person),
  })

export const usePersonen = () =>
  useQuery({ queryKey: ['baustelle', 'personen'], enabled: an, staleTime: 10 * 60_000, queryFn: b.ladePersonen })

/** Nach einer Änderung alles zur Baustelle neu laden (auch Projekte und Service, die davon abhängen). */
export function useNeuLaden() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all(
      ['baustelle', 'projekte', 'service', 'wartung'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    )
  }
}

/** Sobald die Warteschlange etwas gesendet hat, die Ansichten mit den Daten vom Server auffrischen. */
export function useNachSenden() {
  const version = useWarteschlange((s) => s.version)
  const offen = useWarteschlange((s) => s.offen)
  const neuLaden = useNeuLaden()
  useEffect(() => {
    if (offen === 0 && version > 0) void neuLaden()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei neuem Stand der Warteschlange
  }, [version, offen])
}
