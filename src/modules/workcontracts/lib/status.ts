import type { WerkvertragStatus } from '../types'

/** Feste Farbe je Stand des Werkvertrags (statisch, damit Tailwind sie findet). */
export const VERTRAG_TON: Record<WerkvertragStatus, 'neutral' | 'info' | 'marke' | 'ok' | 'kritisch'> = {
  entwurf: 'neutral',
  erstellt: 'info',
  versendet: 'marke',
  unterschrieben: 'ok',
  storniert: 'kritisch',
}

/** Welche Schritte von einem Stand aus möglich sind (die Datenbank prüft dasselbe). */
export const NAECHSTE: Record<WerkvertragStatus, WerkvertragStatus[]> = {
  entwurf: ['erstellt', 'storniert'],
  erstellt: ['versendet', 'unterschrieben', 'storniert'],
  versendet: ['unterschrieben', 'storniert'],
  unterschrieben: ['storniert'],
  storniert: ['erstellt'],
}

/** Treffer der Suche: jedes Wort muss im Suchtext vorkommen. */
export function passt(suchtext: string, suche: string): boolean {
  const woerter = suche.toLowerCase().split(/\s+/).filter(Boolean)
  const s = suchtext.toLowerCase()
  return woerter.every((w) => s.includes(w))
}
