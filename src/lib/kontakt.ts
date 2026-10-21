import type { BadgeProps } from '@/components/ui/badge'
import type { Kontaktzeile } from '@/types/kontakt'

/** Kundennummer wie in V233: K0001. */
export function formatKundennummer(nummer: number | null | undefined): string {
  return nummer ? `K${String(nummer).padStart(4, '0')}` : ''
}

/**
 * Telefonnummer nur als Ziffern in Schweizer Schreibweise, gleich wie `intern.telefon_ziffern`
 * in der Datenbank: «+41 76 123 45 67», «0041 76…» und «076 123 45 67» ergeben «0761234567».
 */
export function telefonZiffern(nummer: string | null | undefined): string {
  const d = (nummer ?? '').replace(/\D/g, '')
  if (d.startsWith('0041')) return `0${d.slice(4)}`
  if (d.startsWith('41') && d.length === 11) return `0${d.slice(2)}`
  return d
}

/**
 * Passt ein Kontakt zur Suche? Sucht in Name, Adresse, Mail, Kunden- und Offertnummer.
 * Besteht die Eingabe nur aus Ziffern (mind. 4), wird auch die Telefonnummer verglichen (V170).
 */
export function passtZurSuche(k: Pick<Kontaktzeile, 'suchtext' | 'telefonZiffern'>, suche: string): boolean {
  const q = suche.trim().toLowerCase()
  if (!q) return true
  const woerter = q.split(/\s+/)
  // Jedes Wort muss passen; reine Ziffern (ab 3) dürfen auch in der Telefonnummer stehen («Bulle 079»).
  const passt = (w: string) =>
    k.suchtext.includes(w) || (/^\d{3,}$/.test(w) && k.telefonZiffern.includes(w.replace(/^0/, '')))
  if (woerter.every(passt)) return true
  if (/[a-zà-ÿ@]/i.test(q)) return false
  // Auch angefangene Nummern mit Ländervorwahl («+41 76 12») finden.
  const ziffern = q.startsWith('+41') ? `0${q.replace(/\D/g, '').slice(2)}` : telefonZiffern(q)
  return ziffern.length >= 4 && k.telefonZiffern.includes(ziffern.replace(/^0/, ''))
}

/** Badge-Ton aus der Farbe einer Auswahlliste (Token-Namen aus der Datenbank). */
export function tonVonFarbe(farbe: string | null | undefined): NonNullable<BadgeProps['ton']> {
  switch (farbe) {
    case 'ok':
      return 'ok'
    case 'warn':
      return 'warnung'
    case 'kritisch':
      return 'kritisch'
    case 'info':
      return 'info'
    case 'marke':
      return 'marke'
    default:
      return 'neutral'
  }
}

/** Postadresse in einer Zeile: «Dorfstrasse 1, 5630 Muri». */
export function adresseEinzeilig(k: Pick<Kontaktzeile, 'strasse' | 'plz' | 'ort'>): string {
  return [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}
