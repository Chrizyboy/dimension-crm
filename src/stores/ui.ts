import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sprache } from '@/types/modul'

export type Darstellung = 'hell' | 'dunkel' | 'system'

interface UiZustand {
  sprache: Sprache
  darstellung: Darstellung
  seitenleisteEingeklappt: boolean
  /** Nicht gespeichert: Befehlspalette und Handy-Menü sind nach dem Start immer zu. */
  befehlspaletteOffen: boolean
  handyMenueOffen: boolean
  setSprache: (s: Sprache) => void
  setDarstellung: (d: Darstellung) => void
  toggleSeitenleiste: () => void
  setBefehlspalette: (offen: boolean) => void
  setHandyMenue: (offen: boolean) => void
}

/**
 * Reiner Oberflächen-Zustand (keine Geschäftsdaten – die kommen über TanStack Query).
 * Sprache, Darstellung und Seitenleiste werden lokal gespeichert, damit die App beim nächsten Start gleich aussieht.
 */
export const useUi = create<UiZustand>()(
  persist(
    (set) => ({
      // Erster Start: Sprache des Geräts (z. B. Französisch in Bulle), danach die zuletzt gewählte.
      sprache: typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'de',
      darstellung: 'system',
      seitenleisteEingeklappt: false,
      befehlspaletteOffen: false,
      handyMenueOffen: false,
      setSprache: (sprache) => {
        set({ sprache })
      },
      setDarstellung: (darstellung) => {
        set({ darstellung })
      },
      toggleSeitenleiste: () => {
        set((z) => ({ seitenleisteEingeklappt: !z.seitenleisteEingeklappt }))
      },
      setBefehlspalette: (befehlspaletteOffen) => {
        set({ befehlspaletteOffen })
      },
      setHandyMenue: (handyMenueOffen) => {
        set({ handyMenueOffen })
      },
    }),
    {
      name: 'dimension-ui',
      partialize: ({ sprache, darstellung, seitenleisteEingeklappt }) => ({
        sprache,
        darstellung,
        seitenleisteEingeklappt,
      }),
    },
  ),
)
