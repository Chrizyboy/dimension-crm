/** Wie dringend ist eine offene Aufgabe? Heute in Schweizer Zeit, damit «heute» um Mitternacht wechselt. */
export type Dringlichkeit = 'ueberfaellig' | 'heute' | 'bald' | 'spaeter' | 'ohne'

/** Gruppen der Liste, in dieser Reihenfolge. */
export const GRUPPEN = ['ueberfaellig', 'heute', 'morgen', 'woche', 'spaeter', 'ohne'] as const
export type Gruppe = (typeof GRUPPEN)[number]

/** Datum «JJJJ-MM-TT» von heute in Zürich. */
export function heuteZuerich(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** Datum «JJJJ-MM-TT» plus Tage (rechnet in UTC, damit Sommerzeit keinen Tag verschluckt). */
export function plusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Wochentag 1 (Montag) bis 7 (Sonntag). */
export function wochentag(datum: string): number {
  return ((new Date(`${datum}T12:00:00Z`).getUTCDay() + 6) % 7) + 1
}

/** Dringlichkeit nach Fälligkeit; «bald» = in den nächsten 3 Tagen. */
export function dringlichkeit(faellig: string | null, heute: string = heuteZuerich()): Dringlichkeit {
  if (!faellig) return 'ohne'
  if (faellig < heute) return 'ueberfaellig'
  if (faellig === heute) return 'heute'
  const tage = (Date.parse(faellig) - Date.parse(heute)) / 86_400_000
  return tage <= 3 ? 'bald' : 'spaeter'
}

/** Gruppe in der Liste: überfällig, heute, morgen, diese Woche (bis Sonntag), später, ohne Datum. */
export function gruppe(faellig: string | null, heute: string = heuteZuerich()): Gruppe {
  if (!faellig) return 'ohne'
  if (faellig < heute) return 'ueberfaellig'
  if (faellig === heute) return 'heute'
  if (faellig === plusTage(heute, 1)) return 'morgen'
  return faellig <= plusTage(heute, 7 - wochentag(heute)) ? 'woche' : 'spaeter'
}

/** «Morgen» beim Verschieben: nächster Arbeitstag (Freitag → Montag). */
export function naechsterArbeitstag(heute: string = heuteZuerich()): string {
  const w = wochentag(heute)
  return plusTage(heute, w >= 5 ? 8 - w : 1)
}

/** «Nächste Woche» beim Verschieben: Montag der nächsten Woche. */
export function naechsterMontag(heute: string = heuteZuerich()): string {
  return plusTage(heute, 8 - wochentag(heute))
}
