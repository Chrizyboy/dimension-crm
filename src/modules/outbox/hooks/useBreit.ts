import { useSyncExternalStore } from 'react'

const ABFRAGE = '(min-width: 1280px)'

function abonnieren(neu: () => void) {
  const m = window.matchMedia(ABFRAGE)
  m.addEventListener('change', neu)
  return () => {
    m.removeEventListener('change', neu)
  }
}

/**
 * Ist der Bildschirm breit genug für drei Spalten (Tailwind `xl`)? Dann steht die Nachricht rechts neben der Liste,
 * sonst öffnet sie als Seitenpanel. So liegt die Akte nie doppelt im DOM (Tastenkürzel, Formularfelder).
 */
export function useBreit(): boolean {
  return useSyncExternalStore(
    abonnieren,
    () => window.matchMedia(ABFRAGE).matches,
    () => true,
  )
}
