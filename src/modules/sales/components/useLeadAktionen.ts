import { useNavigate } from '@tanstack/react-router'
import { Contact, FileText, SquareArrowOutUpRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { kontaktAktionen, type ZeilenAktion } from '@/lib/zeilenAktionen'
import type { Geschaeft } from '../types'

/**
 * Rechtsklick-Menü eines Leads wie in V234 (recCtxItems): Lead öffnen, Google Maps, Terminblatt, Kundenakte,
 * dann Anrufen und E-Mail. Gibt die Einträge und den Lead zurück, dessen Terminblatt die Liste anzeigen soll.
 */
export function useLeadAktionen(onOeffnen: (id: string) => void) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [blatt, setBlatt] = useState<Geschaeft | null>(null)
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
        ...oben,
        {
          text: t('kontextmenue.terminblatt'),
          icon: FileText,
          hinweis: t('kontextmenue.terminblattHinweis'),
          aktion: () => {
            setBlatt(g)
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
    [t, navigate, onOeffnen],
  )
  return {
    aktionen,
    blatt,
    schliessen: () => {
      setBlatt(null)
    },
  }
}
