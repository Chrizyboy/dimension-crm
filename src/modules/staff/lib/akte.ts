import type { PersonalAkte } from '../types'

/**
 * AHV-Nummer prüfen (756.XXXX.XXXX.XX, Prüfziffer nach EAN-13), damit Tippfehler vor AbaNinja auffallen.
 * Leerzeichen und Punkte dürfen fehlen.
 */
export function ahvGueltig(eingabe: string): boolean {
  const z = eingabe.replace(/\D/g, '')
  if (!/^756\d{10}$/.test(z)) return false
  let summe = 0
  for (let i = 0; i < 12; i++) summe += Number(z[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (summe % 10)) % 10 === Number(z[12])
}

/** AHV-Nummer einheitlich mit Punkten (756.1234.5678.97). */
export function formatAhv(eingabe: string): string {
  const z = eingabe.replace(/\D/g, '')
  return z.length === 13 ? `${z.slice(0, 3)}.${z.slice(3, 7)}.${z.slice(7, 11)}.${z.slice(11)}` : eingabe
}

/** IBAN prüfen (Länge und Prüfsumme Modulo 97), auch ausländische für Grenzgänger. */
export function ibanGueltig(eingabe: string): boolean {
  const iban = eingabe.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[0-9A-Z]{11,30}$/.test(iban)) return false
  if (iban.startsWith('CH') && iban.length !== 21) return false
  const ziffern = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (b) => String(b.charCodeAt(0) - 55))
  let rest = 0
  for (const c of ziffern) rest = (rest * 10 + Number(c)) % 97
  return rest === 1
}

/** IBAN lesbar in Vierergruppen (CH93 0076 2011 6238 5295 7). */
export function formatIban(eingabe: string): string {
  return eingabe
    .replace(/\s/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

/** Ende der Probezeit vorschlagen: gesetzlich ein Monat, üblich drei (OR 335b), also Eintritt + Monate − 1 Tag. */
export function probezeitVorschlag(eintritt: string, monate = 3): string {
  const [j, m, t] = eintritt.split('-').map(Number) as [number, number, number]
  const ende = new Date(Date.UTC(j, m - 1 + monate, t - 1))
  return ende.toISOString().slice(0, 10)
}

/** Eine Frist der Akte für die Kopfzeile: was, wann und ob sie bald fällig oder vorbei ist. */
export interface AkteFrist {
  art: 'probezeit' | 'befristung' | 'bewilligung' | 'gespraech'
  datum: string
  stand: 'offen' | 'bald' | 'vorbei'
}

/**
 * Fristen der Akte für die Chips im Kopf: «bald» ab 60 Tagen vorher. Eine vorbei Probezeit zeigt «bestanden»
 * nur während 30 Tagen, danach ist sie nicht mehr wichtig.
 */
export function akteFristen(a: Partial<PersonalAkte>, heute: string): AkteFrist[] {
  const tage = (d: string) => Math.round((Date.parse(d) - Date.parse(heute)) / 86_400_000)
  const liste: AkteFrist[] = []
  const dazu = (art: AkteFrist['art'], datum: string | null | undefined) => {
    if (!datum) return
    const t = tage(datum)
    if (art === 'probezeit' && t < -30) return
    liste.push({ art, datum, stand: t < 0 ? 'vorbei' : t <= 60 ? 'bald' : 'offen' })
  }
  dazu('probezeit', a.probezeit_bis)
  dazu('befristung', a.befristet_bis)
  dazu('bewilligung', a.bewilligung_bis)
  dazu('gespraech', a.naechstes_gespraech)
  return liste
}
