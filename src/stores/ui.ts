import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NavGruppe, Sprache } from '@/types/modul'

export type Darstellung = 'hell' | 'dunkel' | 'system'

interface UiZustand {
  sprache: Sprache
  darstellung: Darstellung
  seitenleisteEingeklappt: boolean
  /** Von Hand auf- (true) oder zugeklappte Gruppen der Seitenleiste; fehlt eine, gilt die Grundregel der Leiste. */
  gruppenOffen: Partial<Record<NavGruppe, boolean>>
  /** Nicht gespeichert: Befehlspalette und Handy-Menü sind nach dem Start immer zu. */
  befehlspaletteOffen: boolean
  handyMenueOffen: boolean
  /** Assistent-Fenster (Ctrl J), nicht gespeichert. */
  assistentOffen: boolean
  setSprache: (s: Sprache) => void
  setDarstellung: (d: Darstellung) => void
  toggleSeitenleiste: () => void
  setGruppeOffen: (gruppe: NavGruppe, offen: boolean) => void
  setBefehlspalette: (offen: boolean) => void
  setHandyMenue: (offen: boolean) => void
  setAssistent: (offen: boolean) => void
}

/**
 * Reiner Oberflächen-Zustand (keine Geschäftsdaten – die kommen über TanStack Query).
 * Sprache, Darstellung, Seitenleiste und offene Gruppen werden lokal gespeichert, damit die App beim nächsten Start gleich aussieht.
 */
export const useUi = create<UiZustand>()(
  persist(
    (set) => ({
      // Erster Start: Sprache des Geräts (z. B. Französisch in Bulle), danach die zuletzt gewählte.
      sprache: typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'de',
      darstellung: 'system',
      seitenleisteEingeklappt: false,
      gruppenOffen: {},
      befehlspaletteOffen: false,
      handyMenueOffen: false,
      assistentOffen: false,
      setSprache: (sprache) => {
        set({ sprache })
      },
      setDarstellung: (darstellung) => {
        set({ darstellung })
      },
      toggleSeitenleiste: () => {
        set((z) => ({ seitenleisteEingeklappt: !z.seitenleisteEingeklappt }))
      },
      setGruppeOffen: (gruppe, offen) => {
        set((z) => ({ gruppenOffen: { ...z.gruppenOffen, [gruppe]: offen } }))
      },
      setBefehlspalette: (befehlspaletteOffen) => {
        set({ befehlspaletteOffen })
      },
      setHandyMenue: (handyMenueOffen) => {
        set({ handyMenueOffen })
      },
      setAssistent: (assistentOffen) => {
        set({ assistentOffen })
      },
    }),
    {
      name: 'dimension-ui',
      partialize: ({ sprache, darstellung, seitenleisteEingeklappt, gruppenOffen }) => ({
        sprache,
        darstellung,
        seitenleisteEingeklappt,
        gruppenOffen,
      }),
    },
  ),
)
