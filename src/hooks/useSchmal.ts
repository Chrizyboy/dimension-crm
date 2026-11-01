import { useSyncExternalStore } from 'react'

const ABFRAGE = '(max-width: 639px)'

function abonnieren(neu: () => void) {
  const m = window.matchMedia(ABFRAGE)
  m.addEventListener('change', neu)
  return () => {
    m.removeEventListener('change', neu)
  }
}

/**
 * Ist der Bildschirm schmal (Handy, unter der Tailwind-Grenze `sm`)? Für Ansichten, die am Handy ganz anders
 * aufgebaut sind (z. B. Zeitplan als Liste statt Raster), damit nicht beide gleichzeitig im DOM liegen.
 */
export function useSchmal(): boolean {
  return useSyncExternalStore(
    abonnieren,
    () => window.matchMedia(ABFRAGE).matches,
    () => false,
  )
}
