import { useGemerkterFilter } from '@/hooks/useGemerkterFilter'
import { STANDARD_SPALTEN } from '../lib/spalten'

/**
 * Welche Spalten der Pipeline man sieht, gemerkt je Person. Leer heisst alle.
 * Ersetzt den früheren Schalter «Abgeschlossene zeigen»: gewonnen, verloren und Dossier sind am Anfang aus.
 */
export function useSpaltenWahl(): [readonly string[], (sichtbar: string[]) => void] {
  const [wahl, setWahl] = useGemerkterFilter('verkauf.spalten', { sichtbar: STANDARD_SPALTEN })
  return [
    wahl.sichtbar,
    (sichtbar) => {
      setWahl({ sichtbar })
    },
  ]
}
