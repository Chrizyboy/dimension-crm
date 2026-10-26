import { useEffect, useId, useRef } from 'react'
import { sprungAktiv } from '@/lib/spruenge'
import { useKuerzel } from '@/stores/kuerzel'

/** Tippt die Person gerade in ein Feld? Dann gelten einfache Tasten-Kürzel nicht. */
export function schreibtGerade(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof HTMLElement)) return false
  return ziel.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName)
}

/**
 * Einfaches Tasten-Kürzel einer Ansicht, z. B. «N» für neu oder «/» für die Suche.
 * Wirkt nicht beim Schreiben in einem Feld und nicht, solange ein Dialog offen ist.
 * Mit `text` erscheint das Kürzel in der Übersicht der Tastenkürzel («?»).
 */
export function useTaste(taste: string, aktion: () => void, aktiv = true, text?: string): void {
  const aktuell = useRef(aktion)
  useEffect(() => {
    aktuell.current = aktion
  })
  useEffect(() => {
    if (!aktiv) return
    const beiTaste = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || schreibtGerade(e.target)) return
      // Nach «G» ist der nächste Buchstabe ein Sprung in einen Bereich, kein Kürzel der Ansicht.
      if (e.defaultPrevented || sprungAktiv()) return
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
  useKuerzelAnzeige(taste, aktiv ? text : undefined)
}

/**
 * Zeigt ein Kürzel in der Übersicht («?»), das die Ansicht selbst behandelt (z. B. «1–7» für die Reiter).
 * Ohne `text` wird nichts angezeigt.
 */
export function useKuerzelAnzeige(taste: string, text: string | undefined): void {
  const id = useId()
  useEffect(() => {
    if (!text) return
    const { melde, vergiss } = useKuerzel.getState()
    melde(id, { taste, text })
    return () => {
      vergiss(id)
    }
  }, [id, taste, text])
}
