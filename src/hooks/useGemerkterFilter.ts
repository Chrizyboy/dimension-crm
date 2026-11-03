import { useCallback, useMemo, useState } from 'react'
import { useAnmeldung } from '@/stores/anmeldung'
import { useFilterSpeicher } from '@/stores/filter'

/**
 * Wie `useState`, aber der Filter bleibt gemerkt, je Person (wer sich am selben Gerät anmeldet, hat seine eigenen).
 * `start` gilt beim ersten Mal und füllt Felder auf, die später dazugekommen sind.
 */
export function useGemerkterFilter<T extends object>(ansicht: string, start: T): [T, (wert: T) => void] {
  const person = useAnmeldung((z) => z.ich?.id ?? 'ich')
  const schluessel = `${person}:${ansicht}`
  const gespeichert = useFilterSpeicher((z) => z.werte[schluessel]) as Partial<T> | undefined
  const setze = useFilterSpeicher((z) => z.setze)
  // Gleiches Objekt, solange sich nichts ändert: sonst rechnen Listen bei jedem Zeichnen neu.
  const [anfang] = useState(start)
  const wert = useMemo(() => (gespeichert ? { ...anfang, ...gespeichert } : anfang), [anfang, gespeichert])
  const aendere = useCallback(
    (neu: T) => {
      setze(schluessel, neu)
    },
    [setze, schluessel],
  )
  return [wert, aendere]
}
