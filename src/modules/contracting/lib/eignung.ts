import type { Ampel, Grossprojekt, GrossprojektRegeln, GrundbuchLink, Pruefpunkt } from '../types'

/** Die drei Seiten der Youdera-Prüfung in der Reihenfolge der Anzeige. */
export const SEITEN = ['kunde', 'youdera', 'wir'] as const
export type Seite = (typeof SEITEN)[number]

/** Farbe der Ampel als Ton der Badge. */
export const AMPEL_TON: Record<Ampel, 'ok' | 'warnung' | 'kritisch'> = {
  gruen: 'ok',
  gelb: 'warnung',
  rot: 'kritisch',
}

/** Farbe eines Prüfpunkts (Text), damit ✓, ? und ✗ auch ohne Farbe lesbar bleiben. */
export const STAND_FARBE: Record<Pruefpunkt['stand'], string> = {
  ok: 'text-ok',
  offen: 'text-warn',
  nein: 'text-bad',
}

/** Grundbuch-Abfrage für den Kanton des Grossprojekts (aus den Einstellungen), sonst null. */
export function grundbuchFuer(
  g: Pick<Grossprojekt, 'kanton'>,
  regeln: GrossprojektRegeln | undefined,
): GrundbuchLink | null {
  if (!g.kanton) return null
  const eintrag = regeln?.grundbuch?.[g.kanton.toUpperCase()]
  return eintrag && /^https:\/\//.test(eintrag.url) ? eintrag : null
}

/** Offene Punkte, die man vor dem Gespräch oder im Gespräch klären muss (für «So gehst du vor»). */
export function offenePunkte(g: Pick<Grossprojekt, 'eignung'>): Pruefpunkt[] {
  const p = g.eignung.pruefungen
  if (!p) return []
  return SEITEN.flatMap((s) => p[s]).filter((x) => x.stand === 'offen')
}

/** Ist die Prüfung schon gerechnet (Dach bekannt)? */
export const hatEignung = (g: Pick<Grossprojekt, 'eignung'>): boolean => Boolean(g.eignung.ampel)
