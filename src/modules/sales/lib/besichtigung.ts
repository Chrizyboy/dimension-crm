/** Felder der Vor-Ort-Besichtigung wie in V233 (VISIT_FIELDS). */
export interface Besichtigung {
  datum?: string
  flaeche?: string
  ausrichtung?: string
  neigung?: string
  material?: string
  anschluss?: string
  verbrauch?: string
  notiz?: string
}

/** Fotos, die bei jeder Besichtigung gemacht werden; Ordner in `dokumente` ist `besichtigung_<art>`. */
export const BESICHTIGUNG_FOTOS = ['dach', 'zaehler', 'verteilung', 'heizung'] as const
export type BesichtigungFoto = (typeof BESICHTIGUNG_FOTOS)[number]

/** Ein Punkt der Checkliste am Handy. */
export interface CheckPunkt {
  schluessel: string
  erledigt: boolean
}

/** Ordnername eines Besichtigungs-Fotos in den Lead-Dateien. */
export function fotoOrdner(art: BesichtigungFoto): string {
  return `besichtigung_${art}`
}

/**
 * Checkliste der Besichtigung (02.11.2026): Dach (Fläche, Ausrichtung, Neigung, Material), Hausanschluss,
 * Verbrauch und die vier Fotos. Erst wenn alles da ist, hat Andy genug für die Offerte ohne Rückfrage.
 */
export function besichtigungCheckliste(
  b: Besichtigung | null | undefined,
  dateiOrdner: readonly (string | null)[] = [],
): CheckPunkt[] {
  const da = (f: keyof Besichtigung) => Boolean(b?.[f])
  return [
    { schluessel: 'dach', erledigt: da('flaeche') && da('ausrichtung') && da('neigung') && da('material') },
    { schluessel: 'anschluss', erledigt: da('anschluss') },
    { schluessel: 'verbrauch', erledigt: da('verbrauch') },
    ...BESICHTIGUNG_FOTOS.map((art) => ({
      schluessel: `foto_${art}`,
      erledigt: dateiOrdner.includes(fotoOrdner(art)),
    })),
  ]
}

/** Stand der Checkliste, z. B. «5/7» im Kopf des Abschnitts. */
export function besichtigungStand(
  b: Besichtigung | null | undefined,
  dateiOrdner: readonly (string | null)[] = [],
): string {
  const punkte = besichtigungCheckliste(b, dateiOrdner)
  return `${punkte.filter((p) => p.erledigt).length}/${punkte.length}`
}
