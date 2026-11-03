import type { Geschaeft } from '../types'

/** Die sechs Schritte eines Verkaufs, wie Verkauf und Geschäftsleitung sie denken (statt 16 Stände). */
export type VerkaufSchritt = 'neu' | 'kontaktiert' | 'termin' | 'offerte' | 'entscheid' | 'gewonnen'

export const VERKAUF_SCHRITTE: readonly VerkaufSchritt[] = [
  'neu',
  'kontaktiert',
  'termin',
  'offerte',
  'entscheid',
  'gewonnen',
]

const ZU_SCHRITT: Record<string, VerkaufSchritt | 'aus'> = {
  lead_neu: 'neu',
  lead_offen: 'kontaktiert',
  lead_spaeter: 'kontaktiert',
  termin: 'termin',
  nach_termin: 'termin',
  offerte: 'offerte',
  pruefung: 'offerte',
  offeriert: 'entscheid',
  nachfassen: 'entscheid',
  vertagt: 'entscheid',
  angenommen: 'gewonnen',
  bau: 'gewonnen',
  verbaut: 'gewonnen',
  dossier: 'gewonnen',
  verloren: 'aus',
  kein: 'aus',
}

/** Zu welchem Schritt ein Stand gehört; verloren und kein Interesse sind «aus». */
export function schrittVonStand(stand: string): VerkaufSchritt | 'aus' {
  return ZU_SCHRITT[stand] ?? 'neu'
}

/** Ein Schritt der Leiste in der Lead-Akte: erledigt, aktuell oder offen, mit Datum wenn bekannt. */
export interface SchrittStand {
  id: VerkaufSchritt
  fertig: boolean
  am: string | null
}

/**
 * Leiste für die Lead-Akte. Alles vor dem aktuellen Schritt ist erledigt; ein verlorenes Geschäft zeigt,
 * wie weit es kam (mit Offerte bis «Entscheid», sonst bis «Kontaktiert»).
 */
export function leadSchritte(g: Geschaeft): SchrittStand[] {
  const s = schrittVonStand(g.stand)
  const aktuell = s === 'aus' ? (g.offerteId ? 'entscheid' : 'kontaktiert') : s
  const index = VERKAUF_SCHRITTE.indexOf(aktuell)
  const daten: Record<VerkaufSchritt, string | null> = {
    neu: g.eingangZeit ?? g.eingangAm,
    kontaktiert: g.erstkontaktAm ?? g.letzterKontakt,
    termin: g.terminAm,
    offerte: g.angebotAm,
    entscheid: g.entscheidAm,
    gewonnen: s === 'gewonnen' ? (g.entscheidAm ?? g.standDatum) : null,
  }
  return VERKAUF_SCHRITTE.map((id, i) => ({
    id,
    fertig: i < index || (i === index && s === 'gewonnen'),
    am: i <= index ? daten[id] : null,
  }))
}

/**
 * Wohin eine Karte beim Ablegen in einer Schritt-Spalte wechselt. Ein Lead ohne Offerte springt beim Schritt
 * «Offerte» in die Offerte (Richtofferte mit Notiz), mit Offerte in «offeriert».
 */
export const SCHRITT_ZIEL: Record<VerkaufSchritt, string | null> = {
  neu: 'lead_neu',
  kontaktiert: 'lead_offen',
  termin: 'termin',
  offerte: 'offerte',
  entscheid: 'offeriert',
  gewonnen: 'angenommen',
}
