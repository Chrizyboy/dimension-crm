/** Ton des Nachtrag-Stands: offen gelb, bestätigt grün, abgelehnt rot, verrechnet grau. */
export function nachtragTon(status: string): 'ok' | 'kritisch' | 'neutral' | 'warnung' {
  if (status === 'vom_kunden_bestaetigt') return 'ok'
  if (status === 'abgelehnt') return 'kritisch'
  return status === 'verrechnet' ? 'neutral' : 'warnung'
}
