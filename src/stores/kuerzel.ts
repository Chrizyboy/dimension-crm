import { create } from 'zustand'

export interface SeitenKuerzel {
  taste: string
  /** Schon übersetzter Text, z. B. «Neuer Lead». */
  text: string
}

interface KuerzelZustand {
  /** Kürzel der gerade offenen Ansicht, für die Übersicht unter «?». */
  seite: Record<string, SeitenKuerzel>
  /** Ist die Übersicht der Tastenkürzel offen? */
  hilfeOffen: boolean
  melde: (id: string, k: SeitenKuerzel) => void
  vergiss: (id: string) => void
  setHilfe: (offen: boolean) => void
}

/**
 * Welche Tastenkürzel die offene Ansicht gerade anbietet. Die Ansichten melden ihre Kürzel über `useTaste`,
 * die Übersicht («?») liest sie hier. So bleibt die Übersicht immer richtig, ohne eine zweite Liste zu pflegen.
 */
export const useKuerzel = create<KuerzelZustand>()((set) => ({
  seite: {},
  hilfeOffen: false,
  melde: (id, k) => {
    set((z) => ({ seite: { ...z.seite, [id]: k } }))
  },
  vergiss: (id) => {
    set((z) => ({ seite: Object.fromEntries(Object.entries(z.seite).filter(([k]) => k !== id)) }))
  },
  setHilfe: (hilfeOffen) => {
    set({ hilfeOffen })
  },
}))
