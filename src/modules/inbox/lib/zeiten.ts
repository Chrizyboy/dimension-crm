/** Wahl beim Zurückstellen. */
export type ZurueckWahl = 'nachmittag' | 'morgen' | 'montag' | 'woche'

const ARBEITSBEGINN = { h: 7, m: 30 }

function um(d: Date, h: number, m: number): Date {
  const x = new Date(d)
  x.setHours(h, m, 0, 0)
  return x
}

/** Nächster Arbeitstag (Mo–Fr) nach `d`, um Arbeitsbeginn. */
function naechsterArbeitstag(d: Date): Date {
  const x = um(d, ARBEITSBEGINN.h, ARBEITSBEGINN.m)
  do x.setDate(x.getDate() + 1)
  while (x.getDay() === 0 || x.getDay() === 6)
  return x
}

/**
 * Zeiten zum Zurückstellen in Ortszeit: heute 13:30 (nur am Vormittag), nächster Arbeitstag 07:30, nächster Montag
 * 07:30, in einer Woche 07:30. Gibt nur Zeiten in der Zukunft zurück.
 */
export function zurueckZeiten(jetzt = new Date()): { wahl: ZurueckWahl; bis: Date }[] {
  const z: { wahl: ZurueckWahl; bis: Date }[] = []
  const nachmittag = um(jetzt, 13, 30)
  if (jetzt.getDay() !== 0 && jetzt.getDay() !== 6 && jetzt < um(jetzt, 12, 0))
    z.push({ wahl: 'nachmittag', bis: nachmittag })
  z.push({ wahl: 'morgen', bis: naechsterArbeitstag(jetzt) })
  const montag = um(jetzt, ARBEITSBEGINN.h, ARBEITSBEGINN.m)
  montag.setDate(montag.getDate() + ((8 - montag.getDay()) % 7 || 7))
  if (montag.getTime() !== z[z.length - 1]?.bis.getTime()) z.push({ wahl: 'montag', bis: montag })
  const woche = um(jetzt, ARBEITSBEGINN.h, ARBEITSBEGINN.m)
  woche.setDate(woche.getDate() + 7)
  z.push({ wahl: 'woche', bis: woche })
  return z
}
