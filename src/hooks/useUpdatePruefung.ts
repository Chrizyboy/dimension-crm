import { useEffect } from 'react'
import { updatesEingerichtet } from '@/services/aktualisierung'
import { useAktualisierung } from '@/stores/aktualisierung'

const START_MS = 15_000
const ALLE_MS = 6 * 60 * 60 * 1000

/**
 * Fragt in der Desktop-App kurz nach dem Start und danach alle 6 Stunden nach einer neuen Version. Installiert
 * wird nie von selbst: Die Person entscheidet, wann die App neu startet (sonst gingen Eingaben verloren).
 */
export function useUpdatePruefung(): void {
  const pruefe = useAktualisierung((z) => z.pruefe)
  useEffect(() => {
    if (!updatesEingerichtet()) return
    const erst = setTimeout(() => void pruefe(), START_MS)
    const immer = setInterval(() => void pruefe(), ALLE_MS)
    return () => {
      clearTimeout(erst)
      clearInterval(immer)
    }
  }, [pruefe])
}
