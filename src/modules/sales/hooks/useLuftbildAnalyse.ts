import { useKiErgebnis } from '@/services/ki'

/** Gespeicherte Luftbild-Analyse eines Leads (für Terminblatt und Besichtigung). */
export function useLuftbildAnalyse(leadId: string | null) {
  return useKiErgebnis('luftbild', leadId ? { tabelle: 'verkaufschancen', id: leadId } : null)
}
