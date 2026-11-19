import type { LucideIcon } from 'lucide-react'
import { Mail, MapPin, Phone } from 'lucide-react'

/**
 * Ein Eintrag im Rechtsklick-Menü einer Zeile (V234 «showCtx»). Entweder ein Link (`href`, öffnet in neuem
 * Fenster bzw. ruft Telefon/Mail auf) oder eine Aktion (`aktion`). `'trenner'` zeichnet eine Linie.
 */
export type ZeilenAktion =
  | 'trenner'
  | {
      text: string
      icon?: LucideIcon
      /** Kleiner grauer Zusatz rechts, z. B. die Telefonnummer. */
      hinweis?: string | null | undefined
      href?: string
      aktion?: () => void
      gefahr?: boolean
      aus?: boolean
    }

/** Adresse als eine Zeile für Google Maps. */
function adresseText(a: { strasse?: string | null; plz?: string | null; ort?: string | null }): string {
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/**
 * Die Kontakt-Einträge, die jede Zeile mit Kunde gleich hat: Google Maps, Anrufen, E-Mail schreiben.
 * Ohne Adresse bleibt Google Maps ausgegraut, damit man sieht, dass etwas fehlt (wie V234).
 */
export function kontaktAktionen(
  t: (schluessel: string) => string,
  k: {
    strasse?: string | null
    plz?: string | null
    ort?: string | null
    telefon?: string | null
    email?: string | null
  },
): ZeilenAktion[] {
  const adresse = adresseText(k)
  const liste: ZeilenAktion[] = [
    adresse
      ? {
          text: t('kontextmenue.maps'),
          icon: MapPin,
          hinweis: adresse,
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${adresse}, Schweiz`)}`,
        }
      : { text: t('kontextmenue.maps'), icon: MapPin, hinweis: t('kontextmenue.keineAdresse'), aus: true },
  ]
  const weitere: ZeilenAktion[] = []
  if (k.telefon)
    weitere.push({ text: t('kontextmenue.anrufen'), icon: Phone, hinweis: k.telefon, href: `tel:${k.telefon}` })
  if (k.email) weitere.push({ text: t('kontextmenue.mail'), icon: Mail, hinweis: k.email, href: `mailto:${k.email}` })
  return weitere.length ? [...liste, 'trenner', ...weitere] : liste
}
