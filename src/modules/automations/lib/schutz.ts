/**
 * Feiertage aus dem Textfeld lesen: ein Datum pro Zeile (oder mit Komma), «25.12.2026» oder «2026-12-25».
 * Liefert ISO-Daten sortiert und ohne Doppelte, dazu was nicht lesbar war.
 */
export function feiertageLesen(text: string): { daten: string[]; falsch: string[] } {
  const daten = new Set<string>()
  const falsch: string[] = []
  for (const teil of text
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    const ch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(teil)
    const iso = ch ? `${ch[3]}-${(ch[2] ?? '').padStart(2, '0')}-${(ch[1] ?? '').padStart(2, '0')}` : teil
    const d = new Date(`${iso}T12:00:00Z`)
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso)) daten.add(iso)
    else falsch.push(teil)
  }
  return { daten: [...daten].sort(), falsch }
}
