import type { Adresse } from '../types'

/** Navigation zur Baustelle: Koordinaten, sonst die Adresse. Öffnet am Handy die Karten-App. */
export function naviLink(a: Adresse): string | null {
  if (a.breite != null && a.laenge != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${String(a.breite)},${String(a.laenge)}`
  }
  const text = [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return text ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(text)}` : null
}

/** Anruf-Link; Leerzeichen und Striche stören manche Telefone. */
export function telLink(nummer: string | null): string | null {
  const n = (nummer ?? '').replace(/[^\d+]/g, '')
  return n ? `tel:${n}` : null
}

/** Adresse einzeilig: «Musterweg 1, 1630 Bulle». */
export function adressText(a: Pick<Adresse, 'strasse' | 'plz' | 'ort'>): string {
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}
