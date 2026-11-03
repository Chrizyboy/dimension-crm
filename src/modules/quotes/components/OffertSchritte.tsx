import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { offertSchritte } from '../lib/schritte'
import type { Offerte } from '../types'

/** Leiste der Schritte: erledigte grün, der nächste offene orange. */
export function OffertSchritte({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const schritte = offertSchritte(o)
  const naechster = o.status === 'verloren' ? undefined : schritte.find((s) => !s.fertig)?.id
  return (
    <ol className="bg-surface flex overflow-x-auto rounded-lg border" aria-label={t('offerten.schritte.titel')}>
      {schritte.map((s) => (
        <li
          key={s.id}
          aria-current={s.id === naechster ? 'step' : undefined}
          className={cn(
            'flex min-w-28 flex-1 flex-col gap-0.5 border-r px-3 py-2 text-xs last:border-r-0',
            s.fertig && 'bg-ok-soft text-ok',
            s.id === naechster && 'bg-accent-soft text-accent-ink font-semibold',
          )}
        >
          <span className="flex items-center gap-1">
            {s.fertig && <Check className="size-3.5" aria-hidden="true" />}
            {t(`offerten.schritte.${s.id}`)}
          </span>
          <span className="text-xs">{s.am ? formatDatum(s.am) : ' '}</span>
        </li>
      ))}
    </ol>
  )
}
