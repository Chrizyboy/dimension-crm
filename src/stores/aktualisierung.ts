import { create } from 'zustand'
import { installiereUpdate, sucheUpdate, type NeueVersion } from '@/services/aktualisierung'

/** ruhe = noch nicht gefragt, aktuell = neuste Version läuft, bereit = neue Version gefunden. */
export type UpdateStand = 'ruhe' | 'pruefe' | 'aktuell' | 'bereit' | 'laedt' | 'fehler'

interface UpdateZustand {
  stand: UpdateStand
  neu: NeueVersion | null
  /** Anteil 0–1 beim Herunterladen. */
  fortschritt: number
  /** Ist das Fenster «Neue Version» offen? */
  offen: boolean
  pruefe: () => Promise<void>
  installiere: () => Promise<void>
  setOffen: (offen: boolean) => void
}

/**
 * Stand der automatischen Updates der Desktop-App. Kopfzeile (Knopf «Update») und Mein Konto («Nach Updates
 * suchen») lesen denselben Stand, damit nie zweimal geladen wird.
 */
export const useAktualisierung = create<UpdateZustand>()((set, get) => ({
  stand: 'ruhe',
  neu: null,
  fortschritt: 0,
  offen: false,
  pruefe: async () => {
    if (get().stand === 'pruefe' || get().stand === 'laedt') return
    set({ stand: 'pruefe' })
    try {
      const neu = await sucheUpdate()
      set({ stand: neu ? 'bereit' : 'aktuell', neu })
    } catch {
      // Kein Netz oder GitHub nicht erreichbar: still bleiben, beim nächsten Mal wieder fragen.
      set({ stand: 'fehler' })
    }
  },
  installiere: async () => {
    set({ stand: 'laedt', fortschritt: 0 })
    try {
      await installiereUpdate((fortschritt) => {
        set({ fortschritt })
      })
    } catch {
      set({ stand: 'fehler' })
    }
  },
  setOffen: (offen) => {
    set({ offen })
  },
}))
