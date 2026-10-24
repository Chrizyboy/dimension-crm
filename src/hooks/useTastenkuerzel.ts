import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { schreibtGerade } from '@/hooks/useTaste'
import { istKuerzel } from '@/lib/tastenkuerzel'
import { SPRUENGE, beendeSprung, sprungAktiv, starteSprung } from '@/lib/spruenge'
import { useKuerzel } from '@/stores/kuerzel'
import { useUi } from '@/stores/ui'

/** So lange nach «G» wartet die App auf den zweiten Buchstaben. */
const SPRUNG_MS = 1500

/**
 * Globale Tastenkürzel: Ctrl/Cmd K öffnet die Befehlspalette, Ctrl/Cmd B klappt die Seitenleiste,
 * «?» zeigt alle Kürzel, «G» und dann ein Buchstabe springt in einen Bereich (G T = Mein Tag, G K = Kunden …).
 * Kürzel einer Ansicht (z. B. N = neu) kommen über `useTaste`.
 */
export function useTastenkuerzel(): void {
  const navigate = useNavigate()
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      const ui = useUi.getState()
      if (istKuerzel(e, 'k')) {
        e.preventDefault()
        ui.setBefehlspalette(!ui.befehlspaletteOffen)
        return
      }
      if (istKuerzel(e, 'b')) {
        e.preventDefault()
        ui.toggleSeitenleiste()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || schreibtGerade(e.target)) return
      if (document.querySelector('[role="dialog"]')) return
      const taste = e.key.toLowerCase()
      if (taste === '?') {
        e.preventDefault()
        useKuerzel.getState().setHilfe(true)
        return
      }
      if (sprungAktiv()) {
        beendeSprung()
        const ziel = SPRUENGE.find((s) => s.taste === taste)
        if (ziel) {
          // Der Buchstabe gehört zum Sprung, nicht zur Ansicht (z. B. «B» = Baustelle, nicht «bewilligen»).
          e.preventDefault()
          e.stopImmediatePropagation()
          void navigate({ to: ziel.pfad })
        }
        return
      }
      if (taste === 'g') starteSprung(SPRUNG_MS)
    }
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('keydown', beiTaste)
    }
  }, [navigate])
}
