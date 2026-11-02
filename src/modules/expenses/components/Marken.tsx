import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import type { Spese, SpesenHinweis, SpesenStatus } from '../types'

const TON: Record<SpesenStatus, 'info' | 'warnung' | 'ok' | 'neutral' | 'kritisch' | 'marke'> = {
  eingereicht: 'info',
  rueckfrage: 'warnung',
  geprueft: 'marke',
  ausbezahlt: 'ok',
  abgelehnt: 'kritisch',
  storniert: 'neutral',
}

const HINWEIS_TON: Record<SpesenHinweis, 'warnung' | 'kritisch' | 'neutral'> = {
  doppelt: 'kritisch',
  ohne_beleg: 'neutral',
  alt: 'warnung',
  richtwert: 'warnung',
  waehrung: 'warnung',
}

/** Stand der Spese als Marke; ausbezahlt mit Datum und «mit Lohn/Überweisung», Firmenkarte als «verbucht». */
export function StandMarke({ spese: s }: { spese: Spese }) {
  const { t } = useTranslation()
  let text = t(`spesen.status.${s.status}`)
  if (s.status === 'ausbezahlt' && s.ausbezahlt_am)
    text = t('spesen.ausbezahltAm', { datum: formatDatum(s.ausbezahlt_am) })
  if (s.status === 'geprueft' && s.bezahlt_mit === 'firmenkarte') text = t('spesen.status.verbucht')
  return (
    <Badge ton={TON[s.status]} punkt>
      {text}
    </Badge>
  )
}

/** Hinweise für die Prüfung (doppelt, ohne Beleg, alt, über Richtwert, Fremdwährung). */
export function HinweisMarken({ spese: s }: { spese: Spese }) {
  const { t } = useTranslation()
  if (s.hinweise.length === 0 || !['eingereicht', 'rueckfrage', 'geprueft'].includes(s.status)) return null
  return (
    <span className="flex flex-wrap gap-1">
      {s.hinweise.map((h) => (
        <Badge key={h} ton={HINWEIS_TON[h]}>
          {t(`spesen.hinweis.${h}`)}
        </Badge>
      ))}
    </span>
  )
}
