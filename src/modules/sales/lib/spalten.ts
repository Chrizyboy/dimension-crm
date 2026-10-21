import type { Geschaeft } from '../types'

/** Eine Spalte der Pipeline: welche Stände sie zeigt und wohin eine Karte beim Ablegen wechselt. */
export interface PipelineSpalte {
  id: string
  staende: readonly string[]
  /** Stand beim Ablegen; null = Spalte füllt sich nur von selbst (z. B. «nach Termin»). */
  ziel: string | null
  abgeschlossen?: boolean
}

/**
 * Die Spalten von links nach rechts. Abgeschlossene Geschäfte (gewonnen, verloren, Dossier)
 * sind ausgeblendet, bis man sie einschaltet: sonst stünden 400 alte Offerten im Weg.
 */
export const PIPELINE_SPALTEN: readonly PipelineSpalte[] = [
  { id: 'neu', staende: ['lead_neu'], ziel: 'lead_neu' },
  { id: 'offen', staende: ['lead_offen'], ziel: 'lead_offen' },
  { id: 'spaeter', staende: ['lead_spaeter'], ziel: 'lead_spaeter' },
  { id: 'termin', staende: ['termin'], ziel: 'termin' },
  { id: 'nach_termin', staende: ['nach_termin'], ziel: null },
  { id: 'offerte', staende: ['offerte', 'pruefung'], ziel: 'offerte' },
  { id: 'offeriert', staende: ['offeriert', 'nachfassen'], ziel: 'offeriert' },
  { id: 'vertagt', staende: ['vertagt'], ziel: 'vertagt' },
  { id: 'angenommen', staende: ['angenommen'], ziel: 'angenommen' },
  { id: 'gewonnen', staende: ['bau', 'verbaut'], ziel: null, abgeschlossen: true },
  { id: 'verloren', staende: ['kein', 'verloren'], ziel: 'verloren', abgeschlossen: true },
  { id: 'dossier', staende: ['dossier'], ziel: null, abgeschlossen: true },
]

/** Wohin ein Lead ohne Offerte in der Spalte «verloren» fällt: «kein Interesse». */
export function zielInSpalte(spalte: PipelineSpalte, g: Pick<Geschaeft, 'offerteId'>): string | null {
  if (spalte.id === 'verloren' && !g.offerteId) return 'kein'
  return spalte.ziel
}

/** Verteilt die Geschäfte auf die Spalten, neueste Bewegung oben. */
export function verteile(geschaefte: readonly Geschaeft[], mitAbgeschlossenen: boolean) {
  const spalten = PIPELINE_SPALTEN.filter((s) => mitAbgeschlossenen || !s.abgeschlossen)
  const proStand = new Map<string, Geschaeft[]>()
  for (const g of geschaefte) {
    const liste = proStand.get(g.stand) ?? []
    liste.push(g)
    proStand.set(g.stand, liste)
  }
  return spalten.map((s) => ({
    spalte: s,
    karten: s.staende
      .flatMap((st) => proStand.get(st) ?? [])
      .sort((a, b) => (b.standDatum ?? '').localeCompare(a.standDatum ?? '')),
  }))
}
