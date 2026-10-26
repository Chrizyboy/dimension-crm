/** Stunde und Datum in Schweizer Zeit (die Sicherungstermine gelten in Zürich, auch wenn der PC anders steht). */
function zuerich(jetzt: Date): { tag: string; stunde: number } {
  const teile = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Zurich',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(jetzt)
      .map((t) => [t.type, t.value]),
  )
  return { tag: `${teile.year}-${teile.month}-${teile.day}`, stunde: Number(teile.hour) }
}

/**
 * Nächster automatischer Termin wie V233 («nächste: heute 16:00»): die nächste Stunde aus der Liste, die heute noch
 * kommt, sonst die erste von morgen.
 */
export function naechsterTermin(jetzt: Date, stunden: number[]): { morgen: boolean; stunde: number } {
  const liste = [...stunden].sort((a, b) => a - b)
  const { stunde } = zuerich(jetzt)
  const heute = liste.find((h) => h > stunde)
  return heute === undefined ? { morgen: true, stunde: liste[0] ?? 12 } : { morgen: false, stunde: heute }
}

/** Die wichtigsten Zahlen einer Sicherung für die Liste (wie V233: «63 Leads · 608 Offerten»). */
export function kurzInhalt(anzahl: Record<string, number>): {
  kontakte: number
  leads: number
  offerten: number
  total: number
} {
  return {
    kontakte: anzahl.kontakte ?? 0,
    leads: anzahl.verkaufschancen ?? 0,
    offerten: anzahl.offerten ?? 0,
    total: Object.values(anzahl).reduce((a, b) => a + b, 0),
  }
}

/** Dateigrösse lesbar: «1.1 MB», «840 KB». */
export function groesse(bytes: number | null): string {
  if (!bytes) return '–'
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
