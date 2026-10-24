import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ErstWennSichtbarProps {
  children: ReactNode
  /** Platzhalter-Höhe, solange der Inhalt noch nicht geladen ist (verhindert Springen der Seite). */
  minHoehe?: number
  /** Wie früh vor dem Sichtbarwerden geladen wird, z. B. «300px». */
  vorlauf?: string
}

/**
 * Zeigt den Inhalt erst, wenn er fast im Bild ist. Für Abschnitte weiter unten, deren Karten eigene Daten laden:
 * So holt die Seite beim Öffnen nur, was man sieht, und ist am Handy schneller da. Ohne IntersectionObserver
 * (sehr alte Browser, Tests) wird sofort gezeigt.
 */
export function ErstWennSichtbar({ children, minHoehe = 200, vorlauf = '300px' }: ErstWennSichtbarProps) {
  const anker = useRef<HTMLDivElement>(null)
  const [sichtbar, setSichtbar] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (sichtbar || !anker.current) return
    const beobachter = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) setSichtbar(true)
      },
      { rootMargin: vorlauf },
    )
    beobachter.observe(anker.current)
    return () => {
      beobachter.disconnect()
    }
  }, [sichtbar, vorlauf])

  if (sichtbar) return <>{children}</>
  return <div ref={anker} style={{ minHeight: minHoehe }} aria-hidden="true" />
}
