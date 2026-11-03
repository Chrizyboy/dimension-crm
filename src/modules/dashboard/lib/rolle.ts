import { hatRecht } from '@/lib/rechte'
import type { MeineAnmeldung } from '@/types/anmeldung'
import type { KennzahlenReiter } from '../types'

/**
 * Startreiter je Rolle (Neuentwurf 2.11.2026): Buchhaltung Finanzen, wer Finanzen sieht (Geschäftsleitung) den
 * Überblick, Verkauf den Verkauf, Projektleitung und Montage die Abwicklung, sonst den Überblick.
 */
export function startReiter(ich: Pick<MeineAnmeldung, 'rolle' | 'rechte'> | null): KennzahlenReiter {
  if (!ich) return 'ueberblick'
  if (ich.rolle === 'buchhaltung') return 'finanzen'
  if (ich.rechte.includes('finanzen')) return 'ueberblick'
  if (ich.rolle === 'verkauf') return 'verkauf'
  if (['projektleitung', 'montage', 'monteur'].includes(ich.rolle)) return 'abwicklung'
  return 'ueberblick'
}

/** Finanzzahlen (Umsatz, offene Rechnungen) nur mit Recht «finanzen»; ohne Datenbank (Vorschau) alles. */
export function siehtFinanzen(ich: MeineAnmeldung | null, ohneDatenbank: boolean): boolean {
  return ohneDatenbank || hatRecht(ich, 'finanzen')
}
