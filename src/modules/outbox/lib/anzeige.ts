import { formatDatumZeit } from '@/lib/format'
import type { AusgangStatus } from '../types'

/** Farbe der Statusmarke: offen = Info, raus = ok, Fehler = kritisch. */
export const STATUS_TON: Record<AusgangStatus, 'neutral' | 'info' | 'ok' | 'warnung' | 'kritisch'> = {
  wartet: 'warnung',
  freigegeben: 'info',
  wird_gesendet: 'info',
  gesendet: 'ok',
  fehler: 'kritisch',
  verworfen: 'neutral',
}

/** Datum und Uhrzeit kurz: «21.10.2026 14:05». */
export const zeitpunkt = formatDatumZeit

/** Erste Zeile des Inhalts als Vorschau (Betreff bei Mails, Text bei SMS). */
export function vorschau(e: { kanal: string; betreff: string | null; text: string | null }): string {
  const t = e.kanal === 'mail' ? e.betreff : e.text
  return (t ?? '').replace(/\s+/g, ' ').trim()
}
