import { useGemerkterFilter } from '@/hooks/useGemerkterFilter'

/** Welche Schritte (Spalten) der Pipeline man sieht, gemerkt je Person. Leer heisst alle. */
export function useSpaltenWahl(): [readonly string[], (sichtbar: string[]) => void] {
  const [wahl, setWahl] = useGemerkterFilter('verkauf.spalten', { sichtbar: [] as string[] })
  return [
    wahl.sichtbar,
    (sichtbar) => {
      setWahl({ sichtbar })
    },
  ]
}
