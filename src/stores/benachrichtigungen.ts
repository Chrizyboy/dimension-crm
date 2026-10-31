import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Zweisprachig } from '@/types/modul'

export type MeldungsArt = 'info' | 'ok' | 'warnung' | 'kritisch'

export interface Benachrichtigung {
  id: string
  art: MeldungsArt
  /** Zweisprachig, damit eine Meldung nach dem Sprachwechsel nicht in der alten Sprache stehen bleibt. */
  titel: Zweisprachig
  text?: Zweisprachig
  /** ISO-Zeitpunkt. */
  zeit: string
  gelesen: boolean
  /** Ansicht, die beim Klick geöffnet wird, z.B. "/sales". */
  ziel?: string
  /** «server»: aus der Datenbank (Automationen); gelesen und entfernt wird dann dort. */
  quelle?: 'server'
  /** Zusätzlich als Systemmeldung zeigen (Windows-App), z. B. «Meldung wartet auf deinen Entscheid». */
  popup?: boolean
}

export type NeueBenachrichtigung = Omit<Benachrichtigung, 'id' | 'zeit' | 'gelesen'>

interface BenachrichtigungsZustand {
  liste: Benachrichtigung[]
  hinzufuegen: (b: NeueBenachrichtigung) => void
  markiereGelesen: (id: string) => void
  alleGelesen: () => void
  entfernen: (id: string) => void
}

/** Mehr hebt das Gerät nicht auf; Meldungen der Automationen liegen in der Datenbank (siehe useBenachrichtigungsListe). */
const MAX_EINTRAEGE = 50

const WILLKOMMEN: Benachrichtigung = {
  id: 'willkommen-phase-2',
  art: 'info',
  titel: { de: 'Neues Design ist da', fr: 'Le nouveau design est là' },
  text: {
    de: 'Alle Bausteine des CRM auf einer Seite ansehen.',
    fr: 'Voir tous les éléments du CRM sur une seule page.',
  },
  zeit: '2026-10-21T15:00:00.000Z',
  gelesen: false,
  ziel: '/design',
}

/**
 * Lokaler Teil des Posteingangs (Glocke oben rechts): Meldungen, die nur dieses Gerät betreffen.
 * Meldungen der Automationen kommen vom Server und werden in useBenachrichtigungsListe dazugemischt.
 */
export const useBenachrichtigungen = create<BenachrichtigungsZustand>()(
  persist(
    (set) => ({
      liste: [WILLKOMMEN],
      hinzufuegen: (b) => {
        const neu: Benachrichtigung = { ...b, id: crypto.randomUUID(), zeit: new Date().toISOString(), gelesen: false }
        set((z) => ({ liste: [neu, ...z.liste].slice(0, MAX_EINTRAEGE) }))
      },
      markiereGelesen: (id) => {
        set((z) => ({ liste: z.liste.map((b) => (b.id === id ? { ...b, gelesen: true } : b)) }))
      },
      alleGelesen: () => {
        set((z) => ({ liste: z.liste.map((b) => ({ ...b, gelesen: true })) }))
      },
      entfernen: (id) => {
        set((z) => ({ liste: z.liste.filter((b) => b.id !== id) }))
      },
    }),
    { name: 'dimension-benachrichtigungen' },
  ),
)

/** Anzahl ungelesener Benachrichtigungen für das Zählerchen an der Glocke. */
export function zaehleUngelesen(liste: readonly Benachrichtigung[]): number {
  return liste.filter((b) => !b.gelesen).length
}
