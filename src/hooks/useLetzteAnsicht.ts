import { useCallback } from 'react'
import { useGemerkterFilter } from '@/hooks/useGemerkterFilter'

/**
 * Zuletzt benutzte Ansicht eines Bereichs, je Person gemerkt (wie in V234: man landet dort, wo man aufgehört hat).
 * `start` gilt beim ersten Mal; eine gemerkte Ansicht, die es nicht mehr gibt, fällt auf `start` zurück.
 */
export function useLetzteAnsicht<A extends string>(
  bereich: string,
  start: A,
  erlaubt: readonly A[],
): [A, (ansicht: A) => void] {
  const [wert, setze] = useGemerkterFilter<{ ansicht: string }>(`ansicht.${bereich}`, { ansicht: start })
  const gemerkt = (erlaubt as readonly string[]).includes(wert.ansicht) ? (wert.ansicht as A) : start
  const merke = useCallback(
    (ansicht: A) => {
      setze({ ansicht })
    },
    [setze],
  )
  return [gemerkt, merke]
}
