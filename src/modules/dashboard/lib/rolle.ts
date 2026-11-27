import { hatRecht } from '@/lib/rechte'
import type { MeineAnmeldung } from '@/types/anmeldung'
import type { KennzahlenReiter } from '../types'

/**
 * Startreiter: für alle der Start wie im alten CRM (V234, Chris 27.11.2026). Die Reiter je Rolle (Verkauf,
 * Abwicklung, Finanzen …) liegen dahinter.
 */
export function startReiter(): KennzahlenReiter {
  return 'start'
}

/** Finanzzahlen (Umsatz, offene Rechnungen) nur mit Recht «finanzen»; ohne Datenbank (Vorschau) alles. */
export function siehtFinanzen(ich: MeineAnmeldung | null, ohneDatenbank: boolean): boolean {
  return ohneDatenbank || hatRecht(ich, 'finanzen')
}
