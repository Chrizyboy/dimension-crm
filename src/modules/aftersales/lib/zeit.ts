/** ISO-Zeitpunkt für ein Feld «datetime-local» (Ortszeit, ohne Sekunden). */
export function alsLokal(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const z = (n: number) => String(n).padStart(2, '0')
  return `${String(d.getFullYear())}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`
}
