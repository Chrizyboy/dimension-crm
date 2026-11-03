/** Fachtypen für Lagerplatz, Rüstliste und Reklamationen (Einkauf Schritt 2, Entscheid 0041). */

/** Zeile der Rüstliste: was für ein Projekt noch aus dem Lager an die Baustelle geht, nach Lagerplatz. */
export interface RuestZeile {
  material_id: string
  artikel_id: string
  bezeichnung: string
  artikelnummer: string | null
  einheit: string
  lagerort_id: string | null
  lagerplatz: string | null
  offen: number
  reserviert: number
  frei: number
}

export const REKLAMATION_GRUENDE = ['defekt', 'falsch', 'fehlt', 'zu_viel', 'anderes'] as const
export const REKLAMATION_LOESUNGEN = ['gutschrift', 'ersatz', 'ruecksendung', 'keine'] as const
export type ReklamationGrund = (typeof REKLAMATION_GRUENDE)[number]
export type ReklamationLoesung = (typeof REKLAMATION_LOESUNGEN)[number]
export type ReklamationStatus = 'offen' | 'gemeldet' | 'erledigt'

/** Reklamation beim Lieferanten zu einer Bestellung (optional zu einer Position). */
export interface Reklamation {
  id: string
  bestellung_id: string
  position_id: string | null
  menge: number | null
  grund: ReklamationGrund
  beschreibung: string | null
  status: ReklamationStatus
  loesung: ReklamationLoesung | null
  gemeldet_am: string | null
  erledigt_am: string | null
  antwort: string | null
}

/** Aus Ist-Bestand und Gezähltem die Inventur-Zeilen, die abweichen (leere Felder zählen nicht). */
export function inventurAbweichungen(
  zeilen: { artikel_id: string; menge: number }[],
  gezaehlt: Record<string, number | null>,
): { artikel_id: string; menge: number; differenz: number }[] {
  return zeilen.flatMap((z) => {
    const g = gezaehlt[z.artikel_id]
    if (g === null || g === undefined || g === z.menge) return []
    return [{ artikel_id: z.artikel_id, menge: g, differenz: g - z.menge }]
  })
}

/** Vorschlag je Rüstzeile: so viel wie offen ist, höchstens reserviert + frei. */
export function ruestVorschlag(z: Pick<RuestZeile, 'offen' | 'reserviert' | 'frei'>): number {
  return Math.max(0, Math.min(z.offen, z.reserviert + z.frei))
}
