import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { punkteStufe, STUFE_TON } from '../lib/anzeige'
import type { Grossprojekt } from '../types'

/** Punkte als Marke; ausgeschlossene grau mit Grund statt Zahl. */
export function PunkteMarke({ g, t }: { g: Grossprojekt; t: TFunction }) {
  const stufe = punkteStufe(g)
  return (
    <Badge ton={STUFE_TON[stufe]} className="zahlen whitespace-nowrap">
      {g.ausschluss ? t(`grossprojekte.ausschluss.${g.ausschluss}`) : t('grossprojekte.punkte', { n: g.punkte })}
    </Badge>
  )
}
