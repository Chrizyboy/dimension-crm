import type { BadgeProps } from '@/components/ui/badge'
import type { FahrplanSchritt, Projekt, SchrittStand } from '../types'

type Ton = NonNullable<BadgeProps['ton']>

/** Klick auf einen Schritt: offen → in Arbeit → erledigt → nicht nötig → offen (V108). */
export const NAECHSTER_STAND: Record<SchrittStand, SchrittStand> = {
  offen: 'teilweise',
  teilweise: 'erledigt',
  erledigt: 'nicht_noetig',
  nicht_noetig: 'offen',
}

/** Ist ein Schritt fertig (erledigt oder nicht nötig)? */
export const fertig = (stand: SchrittStand) => stand === 'erledigt' || stand === 'nicht_noetig'

/** Farbe eines Schritts: überfällig rot, bald orange, erledigt grün, in Arbeit blau. */
export function schrittTon(s: Pick<FahrplanSchritt, 'stand' | 'ueberfaellig' | 'bald'>): Ton {
  if (s.ueberfaellig) return 'kritisch'
  if (s.stand === 'erledigt') return 'ok'
  if (s.stand === 'nicht_noetig') return 'neutral'
  if (s.bald) return 'warnung'
  return s.stand === 'teilweise' ? 'info' : 'neutral'
}

/** Farbe des Baustellen-Status (wie die Legende in Andys Excel-Planung). */
export const BAU_TON: Record<string, Ton> = {
  ausstehend: 'kritisch',
  terminiert: 'marke',
  ibn: 'warnung',
  fertig: 'info',
}

/** Datum, das zum Stand gehört: erledigt am, eingereicht am. */
export function schrittDatum(s: Pick<FahrplanSchritt, 'stand' | 'erledigt_am' | 'eingereicht_am'>): string | null {
  if (s.stand === 'erledigt') return s.erledigt_am
  if (s.stand === 'teilweise') return s.eingereicht_am
  return null
}

/**
 * Projekte, die in den Reiter Bewilligungen gehören (V48): im Bau oder als Auftrag, der in den letzten
 * 12 Monaten unterschrieben wurde oder bei dem schon eine Bewilligung läuft; nur solange noch etwas offen ist.
 */
export function brauchtBewilligung(p: Projekt, schritte: FahrplanSchritt[], heute: Date): boolean {
  if (!p.stand || p.stand.bewilligungen_offen === 0) return false
  if (p.status === 'im_bau') return true
  if (p.status !== 'auftrag') return false
  const vorJahr = new Date(heute.getFullYear() - 1, heute.getMonth(), heute.getDate()).toISOString().slice(0, 10)
  return (p.unterzeichnet_am ?? '') >= vorJahr || schritte.some((s) => s.stand !== 'offen' || s.eigene_frist)
}

/** Sortierung für Bewilligungen: überfällige zuerst, dann nach Kunde. */
export function nachDringlichkeit(a: Projekt, b: Projekt): number {
  const sa = a.stand?.bewilligungen_spaet ? 0 : 1
  const sb = b.stand?.bewilligungen_spaet ? 0 : 1
  return sa - sb || a.kunde.localeCompare(b.kunde, 'de')
}
