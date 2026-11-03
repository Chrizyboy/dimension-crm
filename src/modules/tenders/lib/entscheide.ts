/** Entscheide eines Dossiers: welche je Stand möglich sind und welche Angaben sie brauchen. */
import type { Dossier } from '../types'

/** Angaben, die ein Entscheid abfragen kann. */
export type Angabe = 'grund' | 'datum' | 'form' | 'ausloeser' | 'nogo' | 'betrag' | 'gewinner' | 'ohne_protokoll'

/**
 * Welche Angaben ein Entscheid braucht. «Nicht teilnehmen» mit Grund aus der Liste (Auswertung), «eingereicht»
 * mit Betrag exkl. MWST, Zuschlag und Absage mit Datum und, falls es kein Öffnungsprotokoll gibt, dem Grund dafür.
 */
export const BRAUCHT: Record<string, Angabe[]> = {
  nicht_teilnehmen: ['nogo', 'grund'],
  verwerfen: ['grund'],
  ablehnen: ['grund'],
  spaeter: ['datum', 'grund'],
  eingereicht: ['datum', 'form', 'betrag'],
  zuschlag: ['datum', 'betrag', 'ohne_protokoll'],
  absage: ['datum', 'gewinner', 'betrag', 'grund', 'ohne_protokoll'],
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
