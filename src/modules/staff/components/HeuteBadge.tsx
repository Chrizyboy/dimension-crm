import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import type { Heute } from '../types'

/**
 * Was die Person heute tut, als Marke: abwesend (Grund nur, wenn man ihn sehen darf), Kurs, Baustelle oder
 * Service-Termin. Ohne Eintrag gilt «da».
 */
export function HeuteBadge({ heute, lang = false }: { heute: Heute | null; lang?: boolean }) {
  const { t } = useTranslation()
  const abwesenheit = useAuswahl('abwesenheit')
  if (!heute) return <Badge ton="ok">{t('team.heute.da')}</Badge>
  switch (heute.art) {
    case 'abwesend':
      return (
        <Badge ton="neutral" punkt>
          {heute.grund
            ? t('team.heute.grundBis', { grund: abwesenheit.text(heute.grund), datum: formatDatum(heute.bis) })
            : t('team.heute.abwesendBis', { datum: formatDatum(heute.bis) })}
        </Badge>
      )
    case 'kurs':
      return (
        <Badge ton="marke" punkt>
          {lang && heute.titel ? heute.titel : t('team.heute.kurs')}
        </Badge>
      )
    case 'einsatz':
      return (
        <Badge ton="info">
          {heute.ort ? t('team.heute.baustelleIn', { ort: heute.ort }) : t('team.heute.baustelle')}
          {lang && heute.nummer ? ` · ${heute.nummer}` : ''}
        </Badge>
      )
    case 'service':
      return (
        <Badge ton="info">
          {heute.zeit ? t('team.heute.serviceUm', { zeit: heute.zeit }) : t('team.heute.service')}
          {lang && heute.nummer ? ` · ${heute.nummer}` : ''}
        </Badge>
      )
  }
}
