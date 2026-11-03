import type { Geschaeft } from '../types'

/** Eine Spalte der Pipeline: welche Stände sie zeigt und wohin eine Karte beim Ablegen wechselt. */
export interface PipelineSpalte {
  id: string
  staende: readonly string[]
  /** Stände, die erst mit «abgeschlossene zeigen» dazukommen (sonst stünden 400 alte Aufträge im Weg). */
  abgeschlosseneStaende?: readonly string[]
  /** Stand beim Ablegen; null = Spalte füllt sich nur von selbst. */
  ziel: string | null
  abgeschlossen?: boolean
}

/**
 * Die sechs Schritte eines Verkaufs von links nach rechts (02.11.2026, statt 12 Spalten): neu, kontaktiert,
 * Termin, Offerte, Entscheid, gewonnen. Unterstände (später, nach Termin, vertagt …) stehen auf der Karte.
 * «Aus» (verloren, kein Interesse) und gebaute Aufträge sind ausgeblendet, bis man sie einschaltet.
 */
export const PIPELINE_SPALTEN: readonly PipelineSpalte[] = [
  { id: 'neu', staende: ['lead_neu'], ziel: 'lead_neu' },
  { id: 'kontaktiert', staende: ['lead_offen', 'lead_spaeter'], ziel: 'lead_offen' },
  { id: 'termin', staende: ['termin', 'nach_termin'], ziel: 'termin' },
  { id: 'offerte', staende: ['offerte', 'pruefung'], ziel: 'offerte' },
  { id: 'entscheid', staende: ['offeriert', 'nachfassen', 'vertagt'], ziel: 'offeriert' },
  {
    id: 'gewonnen',
    staende: ['angenommen'],
    abgeschlosseneStaende: ['bau', 'verbaut', 'dossier'],
    ziel: 'angenommen',
  },
  { id: 'aus', staende: ['kein', 'verloren'], ziel: 'verloren', abgeschlossen: true },
]

/** Wohin ein Lead ohne Offerte in der Spalte «verloren» fällt: «kein Interesse». */
export function zielInSpalte(spalte: PipelineSpalte, g: Pick<Geschaeft, 'offerteId'>): string | null {
  if (spalte.id === 'aus' && !g.offerteId) return 'kein'
  return spalte.ziel
}

/** Spalten, die man mit «Spalten» ein- und ausblenden kann; «Aus» kommt über «Abgeschlossene zeigen». */
export const WAEHLBARE_SPALTEN: readonly PipelineSpalte[] = PIPELINE_SPALTEN.filter((s) => !s.abgeschlossen)

/**
 * Verteilt die Geschäfte auf die Spalten, neueste Bewegung oben.
 * `sichtbar`: gewählte Spalten aus «Spalten»; leer (oder nur unbekannte, alte Namen) heisst alle.
 */
export function verteile(
  geschaefte: readonly Geschaeft[],
  mitAbgeschlossenen: boolean,
  sichtbar: readonly string[] = [],
) {
  const bekannt = sichtbar.filter((id) => WAEHLBARE_SPALTEN.some((s) => s.id === id))
  const spalten = PIPELINE_SPALTEN.filter((s) =>
    s.abgeschlossen ? mitAbgeschlossenen : bekannt.length === 0 || bekannt.includes(s.id),
  )
  const proStand = new Map<string, Geschaeft[]>()
  for (const g of geschaefte) {
    const liste = proStand.get(g.stand) ?? []
    liste.push(g)
    proStand.set(g.stand, liste)
  }
  return spalten.map((s) => ({
    spalte: s,
    karten: [...s.staende, ...(mitAbgeschlossenen ? (s.abgeschlosseneStaende ?? []) : [])]
      .flatMap((st) => proStand.get(st) ?? [])
      .sort((a, b) => (b.standDatum ?? '').localeCompare(a.standDatum ?? '')),
  }))
}
