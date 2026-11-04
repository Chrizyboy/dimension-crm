/** Ton des Nachtrag-Stands: offen gelb, bestätigt grün, abgelehnt rot, verrechnet grau. */
export function nachtragTon(status: string): 'ok' | 'kritisch' | 'neutral' | 'warnung' {
  if (status === 'vom_kunden_bestaetigt') return 'ok'
  if (status === 'abgelehnt') return 'kritisch'
  return status === 'verrechnet' ? 'neutral' : 'warnung'
}

/** Ziel einer Zeit als Text: Projekt-, Service-Nummer oder interner Posten in der Sprache. */
export function zielText(
  z: {
    projekt_nummer?: string | null
    service_nummer?: string | null
    intern?: string | null
    intern_de?: string | null
    intern_fr?: string | null
  },
  sprache: 'de' | 'fr',
): string {
  return z.projekt_nummer ?? z.service_nummer ?? (sprache === 'fr' ? z.intern_fr : z.intern_de) ?? z.intern ?? ''
}
