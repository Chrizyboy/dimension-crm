/** «39’874.30», «10 048,75», «-9’504.00» → Zahl. */
export function zahl(text: string): number {
  let s = text.replace(/[’'\s  ]/g, '')
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  else s = s.replace(/,/g, '')
  return Number(s)
}

/** Betrag als Text → Rappen (Ganzzahl). */
export function rappen(text: string): number {
  return Math.round(zahl(text) * 100)
}
