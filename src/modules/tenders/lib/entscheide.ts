/** Entscheide eines Dossiers: welche je Stand möglich sind und welche Angaben sie brauchen. */
import type { Dossier } from '../types'

/** Welche Angaben ein Entscheid braucht. */
export const BRAUCHT: Record<string, ('grund' | 'datum' | 'form' | 'ausloeser')[]> = {
  nicht_teilnehmen: ['grund'],
  verwerfen: ['grund'],
  ablehnen: ['grund'],
  spaeter: ['datum', 'grund'],
  eingereicht: ['datum', 'form'],
  absage: ['grund'],
  beobachten: ['ausloeser', 'datum'],
}

/** Ob ein Entscheid einen Dialog mit Angaben braucht (sonst gleich ausführen). */
export const brauchtAngaben = (entscheid: string) => entscheid in BRAUCHT

/** Welche Entscheide in welchem Stand möglich sind; der erste ist der Hauptknopf. */
export function moeglicheEntscheide(d: Pick<Dossier, 'spur' | 'status'>): string[] {
  if (['verworfen', 'archiviert', 'spaeter', 'nicht_teilnehmen', 'kein_interesse'].includes(d.status)) {
    return ['wieder_oeffnen']
  }
  if (d.spur === 'angebot') {
    switch (d.status) {
      case 'pruefen':
        return ['teilnehmen', 'nicht_teilnehmen', 'spaeter', 'beobachten']
      case 'teilnahme':
        return ['kalkulation', 'eingereicht', 'nicht_teilnehmen']
      case 'kalkulation':
        return ['eingereicht', 'nicht_teilnehmen']
      case 'eingereicht':
        return ['zuschlag', 'absage']
      default:
        return []
    }
  }
  if (d.spur === 'beobachten') return ['akquise', 'angebot', 'verwerfen']
  if (['lead', 'zuschlag', 'absage'].includes(d.status)) return []
  return ['verwerfen', 'spaeter', 'beobachten']
}
