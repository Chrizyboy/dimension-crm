import { useEffect } from 'react'
import { istKuerzel } from '@/lib/tastenkuerzel'
import { useUi } from '@/stores/ui'

/**
 * Globale Tastenkürzel: Ctrl/Cmd K öffnet die Befehlspalette, Ctrl/Cmd B klappt die Seitenleiste.
 * Weitere Kürzel kommen mit den Modulen (z.B. N = neu) und stehen dann auch in der Befehlspalette.
 */
export function useTastenkuerzel(): void {
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      const ui = useUi.getState()
      if (istKuerzel(e, 'k')) {
        e.preventDefault()
        ui.setBefehlspalette(!ui.befehlspaletteOffen)
      } else if (istKuerzel(e, 'b')) {
        e.preventDefault()
        ui.toggleSeitenleiste()
      }
    }
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('keydown', beiTaste)
    }
  }, [])
}
