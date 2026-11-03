import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Schritt } from '../lib/schritte'

/** Leiste der Arbeitsschritte: erledigte grün, der nächste offene orange. */
export function FallSchritte({ schritte }: { schritte: Schritt[] }) {
  const { t } = useTranslation()
  const naechster = schritte.find((s) => !s.fertig)?.id
  return (
    <ol className="bg-surface flex overflow-x-auto rounded-lg border" aria-label={t('service.schritte.titel')}>
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
            {t(`service.schritte.${s.id}`)}
          </span>
          <span className="text-xs">{s.am ? formatDatum(s.am) : ' '}</span>
        </li>
      ))}
    </ol>
  )
}
