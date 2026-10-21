import { useEffect } from 'react'
import i18n from '@/i18n'
import { useUi } from '@/stores/ui'

/**
 * Wendet Sprache und Hell/Dunkel aus den Einstellungen auf die ganze App an.
 * «System» folgt der Windows- bzw. Handy-Einstellung und reagiert auf Wechsel.
 */
export function useOberflaeche(): void {
  const sprache = useUi((z) => z.sprache)
  const darstellung = useUi((z) => z.darstellung)

  useEffect(() => {
    void i18n.changeLanguage(sprache)
    document.documentElement.lang = sprache === 'fr' ? 'fr-CH' : 'de-CH'
  }, [sprache])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const anwenden = () => {
      const dunkel = darstellung === 'dunkel' || (darstellung === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dunkel)
    }
    anwenden()
    media.addEventListener('change', anwenden)
    return () => {
      media.removeEventListener('change', anwenden)
    }
  }, [darstellung])
}
