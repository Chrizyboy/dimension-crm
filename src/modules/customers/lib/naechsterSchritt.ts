import { ArrowRight, CalendarClock, CircleCheck, Hammer, Lightbulb, PhoneCall, type LucideIcon } from 'lucide-react'
import type { Kontaktzeile } from '@/types/kontakt'
import type { Kundenakte } from '../types'
import { datumOderLeer, terminText } from './anzeige'

export interface Schritt {
  schluessel: string
  werte: Record<string, string>
  icon: LucideIcon
  ton: 'warn' | 'info' | 'ok' | 'neutral'
  anrufen: boolean
}

/**
 * Leitet aus dem Stand ab, was als Nächstes zu tun ist. Bewusst nur ein Satz: die Akte soll
 * zuerst beantworten «Was muss ich jetzt tun?» (Bau-Auftrag 3.2).
 */
export function naechsterSchritt(kopf: Kontaktzeile, akte: Kundenakte): Schritt | null {
  const vk = akte.verkaufschancen.find((v) => v.id === kopf.standBezug) ?? akte.verkaufschancen[0]
  const of = akte.offerten.find((o) => o.id === kopf.standBezug) ?? akte.offerten[0]
  const pr = akte.projekte.find((p) => p.id === kopf.standBezug) ?? akte.projekte[0]
  const s = (
    schluessel: string,
    icon: LucideIcon,
    ton: Schritt['ton'],
    werte: Record<string, string> = {},
    anrufen = false,
  ) => ({
    schluessel,
    icon,
    ton,
    werte,
    anrufen,
  })
  switch (kopf.stand) {
    case 'lead_neu':
    case 'lead_offen':
      return s('erstkontakt', PhoneCall, 'warn', {}, true)
    case 'lead_spaeter':
      return s('spaeter', CalendarClock, 'neutral', { datum: datumOderLeer(vk?.wiedervorlage_am) || '–' }, true)
    case 'termin':
      return s('termin', CalendarClock, 'info', { termin: terminText(vk?.termin_am) })
    case 'nach_termin':
      return s('nachTermin', ArrowRight, 'warn', { termin: terminText(vk?.termin_am) })
    case 'offerte':
    case 'pruefung':
      return s('offerteInArbeit', ArrowRight, 'info', { nummer: of?.nummer ?? '' })
    case 'nachfassen':
      return s(
        'nachfassen',
        PhoneCall,
        'warn',
        {
          nummer: of?.nummer ?? '',
          angebot: datumOderLeer(of?.angebot_am) || '–',
          datum: datumOderLeer(of?.nachfassen_am ?? of?.angebot_am) || '–',
        },
        true,
      )
    case 'vertagt':
      return s('vertagt', CalendarClock, 'neutral', {
        nummer: of?.nummer ?? '',
        datum: datumOderLeer(of?.nachfassen_am) || '–',
      })
    case 'offeriert':
      return s('offeriert', CalendarClock, 'info', { nummer: of?.nummer ?? '' })
    case 'angenommen':
      return s('angenommen', Hammer, 'ok', { nummer: pr?.nummer ?? of?.nummer ?? '' })
    case 'bau':
      return s('bau', Hammer, 'info', { datum: datumOderLeer(pr?.baubeginn) || '–' })
    case 'verbaut':
    case 'dossier':
      return s('verbaut', Lightbulb, 'ok')
    case 'verloren':
    case 'kein':
      return s('aus', CircleCheck, 'neutral')
    default:
      return null
  }
}
