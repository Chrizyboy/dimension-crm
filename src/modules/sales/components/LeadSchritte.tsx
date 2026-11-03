import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { leadSchritte, schrittVonStand } from '../lib/schritte'
import type { Geschaeft } from '../types'

/** Leiste der sechs Verkaufsschritte: erledigte grün, der aktuelle orange; «aus» zeigt, wie weit es kam. */
export function LeadSchritte({ g }: { g: Geschaeft }) {
  const { t } = useTranslation()
  const schritte = leadSchritte(g)
  const aus = schrittVonStand(g.stand) === 'aus'
  const aktuell = schritte.find((s) => !s.fertig)?.id
  return (
    <ol className="bg-surface flex overflow-x-auto rounded-lg border" aria-label={t('verkauf.schritte.titel')}>
      {schritte.map((s) => (
        <li
          key={s.id}
          aria-current={s.id === aktuell ? 'step' : undefined}
          className={cn(
            'flex min-w-28 flex-1 flex-col gap-0.5 border-r px-3 py-2 text-xs last:border-r-0',
            s.fertig && 'bg-ok-soft text-ok',
            s.id === aktuell && !aus && 'bg-accent-soft text-accent-ink font-semibold',
            s.id === aktuell && aus && 'bg-muted text-muted-foreground font-semibold line-through',
          )}
        >
          <span className="flex items-center gap-1">
            {s.fertig && <Check className="size-3.5" aria-hidden="true" />}
            {t(`verkauf.schritte.${s.id}`)}
          </span>
          <span className="text-xs">{s.am ? formatDatum(s.am) : ' '}</span>
        </li>
      ))}
    </ol>
  )
}
