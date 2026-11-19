import { useNavigate } from '@tanstack/react-router'
import {
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Contact,
  FileText,
  MessageSquareText,
  PhoneMissed,
  PhoneOutgoing,
  SquareArrowOutUpRight,
  ThumbsDown,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { kontaktAktionen, type ZeilenAktion } from '@/lib/zeilenAktionen'
import type { Geschaeft } from '../types'

/** Was das Menü öffnet: Terminblatt, Kontakt erfassen (mit vorgewähltem Ergebnis) oder Stand wechseln. */
export type LeadDialog =
  | { art: 'blatt'; g: Geschaeft }
  | { art: 'kontakt'; g: Geschaeft; start?: string }
  | { art: 'stand'; g: Geschaeft; ziel: string }

const LEAD = new Set(['lead_neu', 'lead_offen', 'lead_spaeter'])

/**
 * Rechtsklick-Menü eines Leads wie in V234 (recCtxItems): Lead öffnen, die nächsten Schritte je nach Stand
 * (Kontakt-Ergebnis, Termin verschieben/absagen, nach dem Termin zur Offerte), Google Maps, Terminblatt,
 * Kundenakte, dann Anrufen und E-Mail. Gibt die Einträge und den offenen Dialog zurück, den die Liste zeigt.
 */
export function useLeadAktionen(onOeffnen: (id: string) => void) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<LeadDialog | null>(null)
  /** Nächste Schritte je Stand (V234: Ergebnis direkt aus der Zeile), danach ein Trenner. */
  const schritte = useCallback(
    (g: Geschaeft): ZeilenAktion[] => {
      const kontakt = (start: string | undefined, text: string, icon: LucideIcon) => ({
        text,
        icon,
        aktion: () => {
          setDialog({ art: 'kontakt', g, ...(start ? { start } : {}) })
        },
      })
      const stand = (ziel: string, text: string, icon: LucideIcon) => ({
        text,
        icon,
        aktion: () => {
          setDialog({ art: 'stand', g, ziel })
        },
      })
      let liste: ZeilenAktion[] = []
      if (LEAD.has(g.stand))
        liste = [
          kontakt('termin', t('kontextmenue.schritt.termin'), CalendarPlus),
          kontakt('nicht_erreicht', t('kontextmenue.schritt.nichtErreicht'), PhoneMissed),
          kontakt('rueckruf', t('kontextmenue.schritt.rueckruf'), PhoneOutgoing),
          kontakt('kein_interesse', t('kontextmenue.schritt.keinInteresse'), ThumbsDown),
          kontakt(undefined, t('kontextmenue.schritt.kontakt'), MessageSquareText),
        ]
      else if (g.stand === 'termin')
        liste = [
          stand('termin', t('kontextmenue.schritt.verschieben'), CalendarClock),
          stand('lead_spaeter', t('kontextmenue.schritt.absagen'), CalendarX),
          kontakt(undefined, t('kontextmenue.schritt.kontakt'), MessageSquareText),
        ]
      else if (g.stand === 'nach_termin')
        liste = [
          stand('offerte', t('verkauf.heute.zurOfferte'), FileText),
          stand('kein', t('verkauf.heute.keinInteresse'), ThumbsDown),
        ]
      return liste.length ? [...liste, 'trenner'] : []
    },
    [t],
  )

  const aktionen = useCallback(
    (g: Geschaeft, mitOeffnen = true): ZeilenAktion[] => {
      const kontakt = kontaktAktionen(t, g)
      const trenner = kontakt.indexOf('trenner')
      const oben = trenner < 0 ? kontakt : kontakt.slice(0, trenner)
      const unten = trenner < 0 ? [] : kontakt.slice(trenner)
      return [
        ...(mitOeffnen
          ? [
              {
                text: t('kontextmenue.lead'),
                icon: SquareArrowOutUpRight,
                hinweis: g.name,
                aktion: () => {
                  onOeffnen(g.id)
                },
              },
            ]
          : []),
        ...schritte(g),
        ...oben,
        {
          text: t('kontextmenue.terminblatt'),
          icon: FileText,
          hinweis: t('kontextmenue.terminblattHinweis'),
          aktion: () => {
            setDialog({ art: 'blatt', g })
          },
        },
        {
          text: t('kontextmenue.kunde'),
          icon: Contact,
          aktion: () => {
            void navigate({ to: '/customers', search: { kunde: g.kontaktId } })
          },
        },
        ...unten,
      ]
    },
    [t, navigate, onOeffnen, schritte],
  )
  return {
    aktionen,
    dialog,
    schliessen: () => {
      setDialog(null)
    },
  }
}
