import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sprache } from '@/types/modul'

export type Darstellung = 'hell' | 'dunkel' | 'system'

interface UiZustand {
  sprache: Sprache
  darstellung: Darstellung
  seitenleisteEingeklappt: boolean
  setSprache: (s: Sprache) => void
  setDarstellung: (d: Darstellung) => void
  toggleSeitenleiste: () => void
}

/**
 * Reiner Oberflächen-Zustand (keine Geschäftsdaten – die kommen über TanStack Query).
 * Wird lokal gespeichert, damit die App beim nächsten Start gleich aussieht.
 */
export const useUi = create<UiZustand>()(
  persist(
    (set) => ({
      sprache: 'de',
      darstellung: 'system',
      seitenleisteEingeklappt: false,
      setSprache: (sprache) => {
        set({ sprache })
      },
      setDarstellung: (darstellung) => {
        set({ darstellung })
      },
      toggleSeitenleiste: () => {
        set((z) => ({ seitenleisteEingeklappt: !z.seitenleisteEingeklappt }))
      },
    }),
    { name: 'dimension-ui' },
  ),
)
