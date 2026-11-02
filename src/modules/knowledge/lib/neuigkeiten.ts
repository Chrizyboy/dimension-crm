import { neuigkeiten, type Kapitel } from './kapitel'

/** Eine Neuigkeit mit dem Bereich, aus dessen Kapitel sie stammt. */
export interface BereichsNeuigkeit {
  bereich: string
  datum: string
  text: string
}

/** Alle Neuigkeiten der Kapitel, neueste zuerst; `nur` beschränkt auf diese Bereiche. */
export function alleNeuigkeiten(kapitel: Kapitel[], nur?: ReadonlySet<string>): BereichsNeuigkeit[] {
  return kapitel
    .filter((k) => !nur || nur.has(k.id))
    .flatMap((k) => neuigkeiten(k).map((n) => ({ bereich: k.id, ...n })))
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.bereich.localeCompare(b.bereich))
}

const GESEHEN = 'handbuch.neuGesehen'

/** Datum (JJJJ-MM-TT) der zuletzt angeschauten Neuigkeiten in diesem Browser; ohne Speicher leer. */
export function neuGesehen(): string {
  try {
    return localStorage.getItem(GESEHEN) ?? ''
  } catch {
    return ''
  }
}

/** Merkt sich, bis wann die Neuigkeiten angeschaut sind (nur Bequemlichkeit, je Browser). */
export function merkeNeuGesehen(datum: string): void {
  try {
    localStorage.setItem(GESEHEN, datum)
  } catch {
    // Ohne Speicher (privates Fenster) zählt die Zahl am Reiter einfach weiter.
  }
}

/** Rolle der Person → Abschnitt in «Für dich». Zusätzliche Rollen der Datenbank fallen auf die nächstliegende. */
export function rollenAbschnitt(rolle: string | undefined, vorhanden: string[]): string {
  const nah: Record<string, string> = {
    admin: 'administration',
    monteur: 'montage',
    ibn: 'montage',
    mitarbeit: 'verkauf',
  }
  const r = rolle ? (nah[rolle] ?? rolle) : ''
  return vorhanden.includes(r) ? r : (vorhanden[0] ?? '')
}
