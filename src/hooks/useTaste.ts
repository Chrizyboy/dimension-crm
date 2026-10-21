import { useEffect, useRef } from 'react'

/** Tippt die Person gerade in ein Feld? Dann gelten einfache Tasten-Kürzel nicht. */
function schreibtGerade(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof HTMLElement)) return false
  return ziel.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName)
}

/**
 * Einfaches Tasten-Kürzel einer Ansicht, z. B. «N» für neu oder «/» für die Suche.
 * Wirkt nicht beim Schreiben in einem Feld und nicht, solange ein Dialog offen ist.
 */
export function useTaste(taste: string, aktion: () => void, aktiv = true): void {
  const aktuell = useRef(aktion)
  useEffect(() => {
    aktuell.current = aktion
  })
  useEffect(() => {
    if (!aktiv) return
    const beiTaste = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || schreibtGerade(e.target)) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key.toLowerCase() === taste) {
        e.preventDefault()
        aktuell.current()
      }
    }
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('keydown', beiTaste)
    }
  }, [taste, aktiv])
}
