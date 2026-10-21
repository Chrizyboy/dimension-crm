import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Druckt einen Druckbereich (siehe `.druckbereich` in index.css). `aktiv` sagt, ob der Bereich
 * gerade gezeigt werden soll; so steht er nur während des Druckens im Dokument.
 */
export function useDrucken() {
  const [aktiv, setAktiv] = useState(false)
  const drucke = useCallback(() => {
    // Erst synchron zeichnen, dann drucken: window.print() blockiert und nimmt den aktuellen Stand.
    flushSync(() => {
      setAktiv(true)
    })
    document.body.classList.add('drucken')
    const fertig = () => {
      document.body.classList.remove('drucken')
      setAktiv(false)
      window.removeEventListener('afterprint', fertig)
    }
    window.addEventListener('afterprint', fertig)
    window.print()
  }, [])
  return { aktiv, drucke }
}
