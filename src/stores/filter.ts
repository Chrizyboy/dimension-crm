import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilterZustand {
  /** Gemerkte Filter je Person und Ansicht, z. B. «<person>:verkauf» → { personen: [...] }. */
  werte: Record<string, unknown>
  setze: (schluessel: string, wert: unknown) => void
}

/**
 * Zuletzt gewählte Filter, damit eine Liste beim nächsten Öffnen gleich aussieht.
 * Lokal auf dem Gerät gespeichert (wie Sprache und Darstellung): Filter sind persönliche Gewohnheit, keine Geschäftsdaten.
 */
export const useFilterSpeicher = create<FilterZustand>()(
  persist(
    (set) => ({
      werte: {},
      setze: (schluessel, wert) => {
        set((z) => ({ werte: { ...z.werte, [schluessel]: wert } }))
      },
    }),
    { name: 'dimension-filter' },
  ),
)
