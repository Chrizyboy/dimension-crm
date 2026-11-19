import { useEffect } from 'react'

/** Elemente, die Text abschneiden (Tailwind «truncate» und «line-clamp-*»). */
const ABGESCHNITTEN = '.truncate, [class*="line-clamp-"]'

/**
 * Zeigt beim Darüberfahren den ganzen Text, wenn er abgeschnitten ist (V234 «hovfull»). Gilt für die ganze App:
 * ein Zuhörer am Dokument setzt bei Bedarf ein `title`, das der Browser nach kurzer Pause anzeigt.
 * Elemente mit eigenem `title` bleiben, wie sie sind.
 */
export function useVolltext() {
  useEffect(() => {
    function zeige(e: MouseEvent) {
      if (!(e.target instanceof Element)) return
      const el = e.target.closest<HTMLElement>(ABGESCHNITTEN)
      if (!el || (el.title && !el.dataset.volltext)) return
      const abgeschnitten = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
      const text = el.textContent.replace(/\s+/g, ' ').trim()
      if (abgeschnitten && text) {
        el.title = text
        el.dataset.volltext = '1'
      } else if (el.dataset.volltext) {
        el.removeAttribute('title')
        delete el.dataset.volltext
      }
    }
    document.addEventListener('mouseover', zeige)
    return () => {
      document.removeEventListener('mouseover', zeige)
    }
  }, [])
}
