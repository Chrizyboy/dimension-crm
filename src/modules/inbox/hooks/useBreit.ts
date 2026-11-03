import { useSyncExternalStore } from 'react'

const ABFRAGE = '(min-width: 1280px)'

function abonnieren(neu: () => void) {
  const m = window.matchMedia(ABFRAGE)
  m.addEventListener('change', neu)
  return () => {
    m.removeEventListener('change', neu)
  }
}

/** Ist das Fenster breit genug, um Liste und Mail nebeneinander zu zeigen (ab 1280 px)? */
export function useBreit(): boolean {
  return useSyncExternalStore(
    abonnieren,
    () => window.matchMedia(ABFRAGE).matches,
    () => true,
  )
}
