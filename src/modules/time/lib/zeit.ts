/** Rechnen mit Zeiten und Tagen der Zeiterfassung. Angezeigt wird immer Schweizer Zeit. */

const teile = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Datum (JJJJ-MM-TT) und Uhrzeit (HH:MM) eines Zeitpunkts in Schweizer Zeit. */
export function zuerich(zeitpunkt: string | Date): { datum: string; zeit: string } {
  const p = Object.fromEntries(teile.formatToParts(new Date(zeitpunkt)).map((x) => [x.type, x.value]))
  return { datum: `${p.year ?? ''}-${p.month ?? ''}-${p.day ?? ''}`, zeit: `${p.hour ?? ''}:${p.minute ?? ''}` }
}

/** Heute in Schweizer Zeit (JJJJ-MM-TT). */
export function heute(jetzt: Date = new Date()): string {
  return zuerich(jetzt).datum
}

/** Datum plus/minus Tage (auf dem reinen Datum, ohne Sommerzeit-Sprünge). */
export function plusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Wochentag 1 (Montag) bis 7 (Sonntag). */
export function wochentag(datum: string): number {
  const t = new Date(`${datum}T12:00:00Z`).getUTCDay()
  return t === 0 ? 7 : t
}

/** Montag der Woche eines Datums. */
export function wochenStart(datum: string): string {
  return plusTage(datum, 1 - wochentag(datum))
}

/**
 * Zeitpunkt für Schweizer Tag und Uhrzeit als ISO (mit richtiger Sommer-/Winterzeit). Zuerst als UTC angenommen,
 * dann um die Abweichung der Schweizer Uhr korrigiert.
 */
export function zeitpunkt(datum: string, uhrzeit: string): string {
  const roh = new Date(`${datum}T${uhrzeit}:00Z`)
  const z = zuerich(roh)
  const versatz = new Date(`${z.datum}T${z.zeit}:00Z`).getTime() - roh.getTime()
  return new Date(roh.getTime() - versatz).toISOString()
}

/** Minuten einer Zeit ohne Pause; läuft sie noch, bis jetzt. */
export function minuten(start: string, stopp: string | null, pauseMin: number, jetzt: Date = new Date()): number {
  const ende = stopp ? new Date(stopp) : jetzt
  return Math.max(0, Math.round((ende.getTime() - new Date(start).getTime()) / 60_000) - pauseMin)
}

/** Stunden als «8:30»; mit Vorzeichen «+1:15» bzw. «−0:45» (für den Saldo). */
export function stundenText(stunden: number | null | undefined, vorzeichen = false): string {
  const h = stunden ?? 0
  const min = Math.round(Math.abs(h) * 60)
  const text = `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
  if (!vorzeichen || min === 0) return text
  return `${h < 0 ? '−' : '+'}${text}`
}

/** Tage als «20.5» bzw. «3» (halbe Tage bleiben sichtbar). */
export function tageText(tage: number | null | undefined): string {
  const t = Math.round((tage ?? 0) * 2) / 2
  return Number.isInteger(t) ? String(t) : t.toFixed(1)
}

/**
 * Arbeitstage zwischen zwei Daten (Mo–Fr ohne Feiertage), halber Tag zählt pro Tag 0.5. Nur als Vorschau im
 * Antrag; was zählt, rechnet die Datenbank (`intern.zeit_tage`).
 */
export function arbeitstage(von: string, bis: string, feiertage: readonly string[], halbtag = false): number {
  if (!von || !bis || bis < von) return 0
  const frei = new Set(feiertage)
  let n = 0
  for (let d = von; d <= bis; d = plusTage(d, 1)) {
    if (wochentag(d) < 6 && !frei.has(d)) n += halbtag ? 0.5 : 1
    if (n > 400) break
  }
  return n
}

/** Alle Tage eines Monats (JJJJ-MM-TT). */
export function monatsTage(jahr: number, monat: number): string[] {
  const erster = `${jahr}-${String(monat).padStart(2, '0')}-01`
  const tage: string[] = []
  for (let d = erster; d.slice(5, 7) === erster.slice(5, 7); d = plusTage(d, 1)) tage.push(d)
  return tage
}
