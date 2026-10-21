import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { useAuswahl } from '@/hooks/useAuswahl'

interface StandFilterProps {
  gewaehlt: string[]
  anzahl: Record<string, number>
  onChange: (gruppen: string[]) => void
}

/**
 * Filter nach den 6 Stand-Gruppen (Lead, In Offerte, Offeriert …) wie in V233.
 * Mehrfachauswahl; die Zahl zeigt, wie viele Kunden in der Gruppe sind.
 */
export function StandFilter({ gewaehlt, anzahl, onChange }: StandFilterProps) {
  const { t } = useTranslation()
  const { werte, text } = useAuswahl('kundenstand_gruppe')
  return (
    <Filterchips
      beschriftung={t('kunden.standFilter')}
      gewaehlt={gewaehlt}
      onChange={onChange}
      optionen={werte.map((g) => ({ wert: g.schluessel, text: text(g.schluessel), anzahl: anzahl[g.schluessel] ?? 0 }))}
    />
  )
}
