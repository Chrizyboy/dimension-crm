import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { fristInfo } from '../lib/anzeige'
import type { Mail } from '../types'

/** Marke mit dem Stand der Antwortfrist (rot überschritten, orange bald, grün bis wann; erledigt grau oder grün). */
export function FristMarke({ m, t, sprache }: { m: Mail; t: TFunction; sprache: 'de' | 'fr' }) {
  const f = fristInfo(m, sprache)
  return (
    <Badge ton={f.ton} className="zahlen whitespace-nowrap">
      {t(`posteingang.frist.${f.schluessel}`, f.werte)}
    </Badge>
  )
}
