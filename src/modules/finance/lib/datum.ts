/** Kalender-Helfer der Liquidität. Rechnen mit ISO-Daten («2026-10-22») in Ortszeit, ohne Uhrzeit. */

const iso = (d: Date) =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const datum = (s: string) => new Date(`${s}T12:00:00`)

/** Heute in Zürich. */
export function heuteZuerich(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())
}

/** Tage dazuzählen (negativ: abziehen). */
export function plusTage(s: string, tage: number): string {
  const d = datum(s)
  d.setDate(d.getDate() + tage)
  return iso(d)
}

/** Montag der Woche. */
export function montag(s: string): string {
  const d = datum(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}

/** Kalenderwoche nach ISO 8601. */
export function kalenderwoche(s: string): number {
  const d = datum(s)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4, 12)
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86_400_000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

/** Ganze Wochen zwischen zwei Montagen. */
export function wochenZwischen(von: string, bis: string): number {
  return Math.floor((datum(bis).getTime() - datum(von).getTime()) / (7 * 86_400_000))
}

/**
 * Termine einer Fixkosten-Position im Zeitraum: monatlich, alle 3 Monate (ab Startmonat) oder jährlich,
 * am Tag 1–28 (Standard 25), nur zwischen «ab» und «bis».
 */
export function fixTermine(
  f: { rhythmus: string | null; tag: number | null; start_monat: string | null; ab: string | null; bis: string | null },
  von: string,
  bis: string,
): string[] {
  const schritt = f.rhythmus === 'quartal' ? 3 : f.rhythmus === 'jahr' ? 12 : 1
  const tag = Math.min(28, Math.max(1, f.tag ?? 25))
  const start = f.ab ?? '2000-01-01'
  const ende = f.bis ?? '9999-12-31'
  const anker = f.start_monat ? Number(f.start_monat) - 1 : 0
  const d = datum(von)
  const termine: string[] = []
  for (let i = 0; i < 40; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, tag, 12)
    const s = iso(m)
    if (s > bis) break
    if (schritt > 1 && (m.getMonth() - anker + 12) % schritt !== 0) continue
    if (s < von || s < start || s > ende) continue
    termine.push(s)
  }
  return termine
}
