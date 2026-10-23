/** Wie dringend ist eine offene Aufgabe? Heute in Schweizer Zeit, damit «heute» um Mitternacht wechselt. */
export type Dringlichkeit = 'ueberfaellig' | 'heute' | 'bald' | 'spaeter' | 'ohne'

/** Datum «JJJJ-MM-TT» von heute in Zürich. */
export function heuteZuerich(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** Dringlichkeit nach Fälligkeit; «bald» = in den nächsten 3 Tagen. */
export function dringlichkeit(faellig: string | null, heute: string = heuteZuerich()): Dringlichkeit {
  if (!faellig) return 'ohne'
  if (faellig < heute) return 'ueberfaellig'
  if (faellig === heute) return 'heute'
  const tage = (Date.parse(faellig) - Date.parse(heute)) / 86_400_000
  return tage <= 3 ? 'bald' : 'spaeter'
}
