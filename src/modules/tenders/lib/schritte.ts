/** Arbeitsschritte eines Dossiers für die Leiste oben in der Akte: was ist erledigt, was kommt als Nächstes. */
import type { Dossier } from '../types'

/** Ein Schritt mit Datum, wenn erledigt oder geplant. */
export interface Schritt {
  id: string
  fertig: boolean
  am: string | null
}

const NACH_EINGABE = new Set(['eingereicht', 'zuschlag', 'absage'])
const ENTSCHIEDEN = new Set(['zuschlag', 'absage'])
const NACH_SENDEN = new Set(['versendet', 'nachfassen', 'antwort', 'lead', 'kein_interesse'])

/** Schritte je Spur. Angebot: Publikation bis Zuschlag. Akquise: Fund bis Lead. Beobachten: Fund und Auslöser. */
export function schritte(d: Dossier): Schritt[] {
  if (d.spur === 'angebot') {
    const go = d.gng_entscheid === 'go'
    return [
      { id: 'publiziert', fertig: true, am: d.publiziert_am ?? d.erstellt_am },
      { id: 'gng', fertig: d.gng_entscheid != null, am: d.gng_am },
      { id: 'kalkulation', fertig: go && (d.angebot_rappen != null || NACH_EINGABE.has(d.status)), am: null },
      { id: 'pruefung', fertig: d.pruefung_am != null, am: d.pruefung_am },
      { id: 'eingabe', fertig: NACH_EINGABE.has(d.status), am: d.eingereicht_am ?? d.frist_eingabe ?? d.frist },
      { id: 'oeffnung', fertig: (d.anbieter_anzahl ?? 0) > 0 || d.ohne_protokoll != null, am: d.frist_oeffnung },
      { id: 'entscheid', fertig: ENTSCHIEDEN.has(d.status), am: d.entscheid_datum ?? d.zuschlag_erwartet },
    ]
  }
  if (d.spur === 'akquise') {
    return [
      { id: 'gefunden', fertig: true, am: d.publiziert_am ?? d.erstellt_am },
      { id: 'kontakt', fertig: d.status !== 'kontakt_fehlt' && d.status !== 'pruefen', am: null },
      { id: 'bewilligt', fertig: d.status === 'bewilligt' || NACH_SENDEN.has(d.status), am: null },
      { id: 'gesendet', fertig: NACH_SENDEN.has(d.status), am: null },
      { id: 'antwort', fertig: ['antwort', 'lead', 'kein_interesse'].includes(d.status), am: d.wiedervorlage_am },
      { id: 'lead', fertig: d.status === 'lead', am: null },
    ]
  }
  return [
    { id: 'gefunden', fertig: true, am: d.publiziert_am ?? d.erstellt_am },
    { id: 'ausloeser', fertig: false, am: d.ausloeser_am },
  ]
}
