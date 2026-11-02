import type { Akte, ServiceFall } from '../types'

/** Ein Arbeitsschritt eines Falls in der Leiste oben in der Akte. */
export interface Schritt {
  id: 'eingang' | 'diagnose' | 'geplant' | 'vorort' | 'teile' | 'abschluss' | 'verrechnet'
  fertig: boolean
  /** Datum zum Schritt (ISO), soweit bekannt. */
  am: string | null
}

const GRATIS = new Set(['garantie', 'kulanz', 'vertrag'])

/**
 * Leitet die Arbeitsschritte aus den Daten ab (nie von Hand gesetzt): Eingang, Diagnose, Termin, Rapport vor Ort,
 * Teile/RMA, erledigt und verrechnet (Rechnung da oder alles gratis).
 */
export function schritte(f: ServiceFall, a: Akte | undefined): Schritt[] {
  const rapporte = (a?.rapporte ?? []).filter((r) => r.abgeschlossen_am)
  const erledigt = f.status === 'erledigt'
  const verrechnet =
    (a?.rechnungen ?? []).length > 0 ||
    (erledigt && rapporte.length > 0 && rapporte.every((r) => r.verrechnung && GRATIS.has(r.verrechnung)))
  return [
    { id: 'eingang', fertig: true, am: f.erstellt_am },
    { id: 'diagnose', fertig: f.status !== 'neu', am: null },
    { id: 'geplant', fertig: Boolean(f.termin_am) || rapporte.length > 0, am: f.termin_am },
    { id: 'vorort', fertig: rapporte.length > 0, am: rapporte[0]?.abgeschlossen_am ?? null },
    {
      id: 'teile',
      fertig: f.status !== 'teile' && (a?.rma_offen ?? 0) === 0 && (rapporte.length > 0 || erledigt),
      am: null,
    },
    { id: 'abschluss', fertig: erledigt, am: f.erledigt_am },
    { id: 'verrechnet', fertig: verrechnet, am: a?.rechnungen[0]?.datum ?? null },
  ]
}
